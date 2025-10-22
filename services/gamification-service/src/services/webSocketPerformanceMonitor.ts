/**
 * WebSocket Performance Monitoring and Analytics
 */

import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { EnhancedWebSocketService } from './enhancedWebSocketService';

export interface WebSocketMetrics {
  // Connection metrics
  totalConnections: number;
  activeConnections: number;
  authenticatedConnections: number;
  connectionRate: number; // connections per minute
  disconnectionRate: number;
  averageConnectionDuration: number;

  // Message metrics
  messagesPerSecond: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  messageLatency: LatencyMetrics;
  messageFailureRate: number;

  // Room metrics
  totalRooms: number;
  activeRooms: number;
  averageRoomSize: number;
  roomUtilization: number;

  // Performance metrics
  memoryUsage: number;
  cpuUsage: number;
  networkBandwidth: BandwidthMetrics;
  errorRate: number;

  // Real-time metrics
  updateQueueSize: number;
  updateProcessingRate: number;
  updateLatency: number;
  celebrationEvents: number;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  max: number;
}

export interface BandwidthMetrics {
  inbound: number; // bytes per second
  outbound: number;
  total: number;
}

export interface ConnectionEvent {
  type: 'connect' | 'disconnect' | 'authenticate' | 'error';
  userId?: string;
  sessionId: string;
  timestamp: Date;
  metadata?: any;
}

export interface MessageEvent {
  type: 'sent' | 'received' | 'failed';
  userId?: string;
  messageType: string;
  size: number;
  latency?: number;
  timestamp: Date;
  roomId?: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'high_latency' | 'connection_spike' | 'memory_usage' | 'error_rate' | 'queue_backlog';
  severity: 'warning' | 'critical';
  message: string;
  metrics: any;
  timestamp: Date;
  resolved: boolean;
}

export class WebSocketPerformanceMonitor {
  private static instance: WebSocketPerformanceMonitor;
  private wsService: EnhancedWebSocketService;
  private metrics: WebSocketMetrics;
  private connectionEvents: ConnectionEvent[] = [];
  private messageEvents: MessageEvent[] = [];
  private performanceAlerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: WebSocketMetrics[] = [];

  private constructor() {
    this.wsService = EnhancedWebSocketService.getInstance();
    this.metrics = this.initializeMetrics();
  }

  public static getInstance(): WebSocketPerformanceMonitor {
    if (!WebSocketPerformanceMonitor.instance) {
      WebSocketPerformanceMonitor.instance = new WebSocketPerformanceMonitor();
    }
    return WebSocketPerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  public start(): void {
    logger.info('Starting WebSocket performance monitoring');

    // Collect metrics every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.cleanupOldData();
    }, 10000);

    // Initial metrics collection
    this.collectMetrics();

    logger.info('WebSocket performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Final metrics collection
    this.collectMetrics();

    logger.info('WebSocket performance monitoring stopped');
  }

  /**
   * Record connection event
   */
  public recordConnectionEvent(event: ConnectionEvent): void {
    this.connectionEvents.push(event);

    // Update real-time metrics
    switch (event.type) {
      case 'connect':
        this.metrics.connectionRate++;
        break;
      case 'disconnect':
        this.metrics.disconnectionRate++;
        break;
    }

    // Limit event history
    if (this.connectionEvents.length > 1000) {
      this.connectionEvents = this.connectionEvents.slice(-500);
    }
  }

  /**
   * Record message event
   */
  public recordMessageEvent(event: MessageEvent): void {
    this.messageEvents.push(event);

    // Update real-time metrics
    switch (event.type) {
      case 'sent':
        this.metrics.totalMessagesSent++;
        break;
      case 'received':
        this.metrics.totalMessagesReceived++;
        break;
      case 'failed':
        this.metrics.messageFailureRate++;
        break;
    }

    // Limit event history
    if (this.messageEvents.length > 1000) {
      this.messageEvents = this.messageEvents.slice(-500);
    }
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(minutes: number = 60): WebSocketMetrics[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.metricsHistory.filter(m => 
      new Date(m.timestamp || 0) >= cutoffTime
    );
  }

  /**
   * Get performance alerts
   */
  public getPerformanceAlerts(includeResolved: boolean = false): PerformanceAlert[] {
    return this.performanceAlerts.filter(alert => 
      includeResolved || !alert.resolved
    );
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): any {
    const wsStats = this.wsService.getStats();
    const recentConnections = this.connectionEvents.filter(
      event => event.timestamp > new Date(Date.now() - 60000) // Last minute
    );

    return {
      ...wsStats,
      recentConnections: recentConnections.length,
      connectionEvents: {
        connects: recentConnections.filter(e => e.type === 'connect').length,
        disconnects: recentConnections.filter(e => e.type === 'disconnect').length,
        errors: recentConnections.filter(e => e.type === 'error').length
      }
    };
  }

  /**
   * Get message statistics
   */
  public getMessageStats(): any {
    const recentMessages = this.messageEvents.filter(
      event => event.timestamp > new Date(Date.now() - 60000) // Last minute
    );

    const latencies = recentMessages
      .filter(m => m.latency !== undefined)
      .map(m => m.latency!);

    return {
      totalMessages: this.messageEvents.length,
      recentMessages: recentMessages.length,
      messageTypes: this.getMessageTypeDistribution(recentMessages),
      latencyStats: this.calculateLatencyStats(latencies),
      failureRate: this.calculateFailureRate(recentMessages)
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): any {
    const connectionStats = this.getConnectionStats();
    const messageStats = this.getMessageStats();
    const alerts = this.getPerformanceAlerts();

    return {
      timestamp: new Date(),
      summary: {
        status: this.getOverallHealthStatus(),
        activeConnections: connectionStats.totalConnections,
        messagesPerSecond: this.metrics.messagesPerSecond,
        averageLatency: this.metrics.messageLatency.average,
        errorRate: this.metrics.errorRate,
        activeAlerts: alerts.filter(a => !a.resolved).length
      },
      connections: connectionStats,
      messages: messageStats,
      performance: {
        memoryUsage: this.metrics.memoryUsage,
        cpuUsage: this.metrics.cpuUsage,
        networkBandwidth: this.metrics.networkBandwidth
      },
      alerts: alerts,
      recommendations: this.generateRecommendations()
    };
  }

  // Private methods
  private initializeMetrics(): WebSocketMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      authenticatedConnections: 0,
      connectionRate: 0,
      disconnectionRate: 0,
      averageConnectionDuration: 0,
      messagesPerSecond: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      messageLatency: { p50: 0, p95: 0, p99: 0, average: 0, max: 0 },
      messageFailureRate: 0,
      totalRooms: 0,
      activeRooms: 0,
      averageRoomSize: 0,
      roomUtilization: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkBandwidth: { inbound: 0, outbound: 0, total: 0 },
      errorRate: 0,
      updateQueueSize: 0,
      updateProcessingRate: 0,
      updateLatency: 0,
      celebrationEvents: 0
    };
  }

  private collectMetrics(): void {
    const wsStats = this.wsService.getStats();
    const recentMessages = this.messageEvents.filter(
      event => event.timestamp > new Date(Date.now() - 10000) // Last 10 seconds
    );

    // Update connection metrics
    this.metrics.totalConnections = wsStats.totalConnections;
    this.metrics.activeConnections = wsStats.totalConnections;
    this.metrics.authenticatedUsers = wsStats.authenticatedUsers;

    // Update room metrics
    this.metrics.totalRooms = wsStats.totalRooms || 0;
    this.metrics.activeRooms = wsStats.roomStats?.filter(r => r.memberCount > 0).length || 0;
    this.metrics.averageRoomSize = this.calculateAverageRoomSize(wsStats.roomStats || []);

    // Update message metrics
    this.metrics.messagesPerSecond = recentMessages.length / 10;
    this.metrics.messageLatency = this.calculateLatencyMetrics(recentMessages);
    this.metrics.messageFailureRate = this.calculateFailureRate(recentMessages);

    // Update system metrics
    this.updateSystemMetrics();

    // Store metrics history
    this.metricsHistory.push({
      ...this.metrics,
      timestamp: new Date()
    });

    // Limit history size
    if (this.metricsHistory.length > 360) { // 1 hour at 10-second intervals
      this.metricsHistory = this.metricsHistory.slice(-180); // Keep 30 minutes
    }

    // Reset rate counters
    this.metrics.connectionRate = 0;
    this.metrics.disconnectionRate = 0;
  }

  private analyzePerformance(): void {
    // Check for high latency
    if (this.metrics.messageLatency.p95 > 1000) {
      this.createAlert('high_latency', 'warning', 
        `High message latency detected: P95 = ${this.metrics.messageLatency.p95}ms`);
    }

    // Check for connection spikes
    if (this.metrics.connectionRate > 100) {
      this.createAlert('connection_spike', 'warning',
        `High connection rate: ${this.metrics.connectionRate} connections/minute`);
    }

    // Check for memory usage
    if (this.metrics.memoryUsage > 80) {
      this.createAlert('memory_usage', 'critical',
        `High memory usage: ${this.metrics.memoryUsage}%`);
    }

    // Check for error rate
    if (this.metrics.errorRate > 5) {
      this.createAlert('error_rate', 'warning',
        `High error rate: ${this.metrics.errorRate}%`);
    }

    // Check for queue backlog
    if (this.metrics.updateQueueSize > 100) {
      this.createAlert('queue_backlog', 'warning',
        `Update queue backlog: ${this.metrics.updateQueueSize} items`);
    }
  }

  private createAlert(type: string, severity: 'warning' | 'critical', message: string): void {
    // Check if similar alert already exists
    const existingAlert = this.performanceAlerts.find(
      alert => alert.type === type && !alert.resolved
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      severity,
      message,
      metrics: { ...this.metrics },
      timestamp: new Date(),
      resolved: false
    };

    this.performanceAlerts.push(alert);

    logger.warn(`WebSocket performance alert: ${message}`, { alert });

    // Store alert in database
    this.storeAlert(alert);
  }

  private calculateLatencyMetrics(messages: MessageEvent[]): LatencyMetrics {
    const latencies = messages
      .filter(m => m.latency !== undefined)
      .map(m => m.latency!)
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0, max: 0 };
    }

    return {
      p50: this.percentile(latencies, 0.5),
      p95: this.percentile(latencies, 0.95),
      p99: this.percentile(latencies, 0.99),
      average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      max: Math.max(...latencies)
    };
  }

  private calculateFailureRate(messages: MessageEvent[]): number {
    if (messages.length === 0) return 0;
    
    const failures = messages.filter(m => m.type === 'failed').length;
    return (failures / messages.length) * 100;
  }

  private calculateAverageRoomSize(roomStats: any[]): number {
    if (roomStats.length === 0) return 0;
    
    const totalMembers = roomStats.reduce((sum, room) => sum + room.memberCount, 0);
    return totalMembers / roomStats.length;
  }

  private updateSystemMetrics(): void {
    // In a real implementation, these would be collected from system monitoring
    this.metrics.memoryUsage = Math.random() * 100; // Placeholder
    this.metrics.cpuUsage = Math.random() * 100; // Placeholder
    this.metrics.networkBandwidth = {
      inbound: Math.random() * 1000,
      outbound: Math.random() * 1000,
      total: 0
    };
    this.metrics.networkBandwidth.total = 
      this.metrics.networkBandwidth.inbound + this.metrics.networkBandwidth.outbound;
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private getMessageTypeDistribution(messages: MessageEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const message of messages) {
      distribution[message.messageType] = (distribution[message.messageType] || 0) + 1;
    }
    
    return distribution;
  }

  private calculateLatencyStats(latencies: number[]): LatencyMetrics {
    return this.calculateLatencyMetrics(
      latencies.map(lat => ({ latency: lat } as MessageEvent))
    );
  }

  private getOverallHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = this.performanceAlerts.filter(
      alert => alert.severity === 'critical' && !alert.resolved
    );
    
    if (criticalAlerts.length > 0) return 'critical';
    
    const warningAlerts = this.performanceAlerts.filter(
      alert => alert.severity === 'warning' && !alert.resolved
    );
    
    if (warningAlerts.length > 0) return 'warning';
    
    return 'healthy';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.messageLatency.p95 > 500) {
      recommendations.push('Consider optimizing message processing or scaling WebSocket servers');
    }
    
    if (this.metrics.memoryUsage > 70) {
      recommendations.push('Monitor memory usage and consider garbage collection optimization');
    }
    
    if (this.metrics.errorRate > 2) {
      recommendations.push('Investigate error patterns and improve error handling');
    }
    
    if (this.metrics.activeConnections > 1000) {
      recommendations.push('Consider implementing connection pooling or load balancing');
    }
    
    return recommendations;
  }

  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    // Clean up old events
    this.connectionEvents = this.connectionEvents.filter(
      event => event.timestamp > cutoffTime
    );
    
    this.messageEvents = this.messageEvents.filter(
      event => event.timestamp > cutoffTime
    );
    
    // Clean up old alerts (keep for 24 hours)
    const alertCutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.performanceAlerts = this.performanceAlerts.filter(
      alert => alert.timestamp > alertCutoffTime
    );
  }

  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await db.query(`
        INSERT INTO websocket_performance_alerts (id, type, severity, message, metrics, timestamp, resolved)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        alert.id,
        alert.type,
        alert.severity,
        alert.message,
        JSON.stringify(alert.metrics),
        alert.timestamp,
        alert.resolved
      ]);
    } catch (error) {
      logger.error('Failed to store performance alert:', error);
    }
  }
}