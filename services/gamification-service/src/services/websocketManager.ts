/**
 * WebSocket manager for real-time gamification events
 */

import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../telemetry/logger';
import { GameEvent } from '../models';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(server: any): void {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/gamification'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    logger.info('WebSocket server initialized for gamification events');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage): void {
    logger.info('New WebSocket connection established');

    ws.isAlive = true;

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to gamification service',
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: AuthenticatedWebSocket, message: any): void {
    switch (message.type) {
      case 'authenticate':
        this.authenticateClient(ws, message.userId, message.token);
        break;

      case 'subscribe':
        this.subscribeToEvents(ws, message.events);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;

      default:
        logger.warn('Unknown WebSocket message type:', message.type);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  /**
   * Authenticate WebSocket client
   */
  private authenticateClient(ws: AuthenticatedWebSocket, userId: string, token: string): void {
    // In a real implementation, you'd validate the token
    // For now, we'll just accept any userId
    if (!userId) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'User ID required'
      }));
      return;
    }

    ws.userId = userId;

    // Add to clients map
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    ws.send(JSON.stringify({
      type: 'authenticated',
      userId: userId,
      timestamp: new Date().toISOString()
    }));

    logger.info(`WebSocket client authenticated: ${userId}`);
  }

  /**
   * Subscribe client to specific event types
   */
  private subscribeToEvents(ws: AuthenticatedWebSocket, events: string[]): void {
    if (!ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required'
      }));
      return;
    }

    // Store subscription preferences (in a real app, you'd persist this)
    (ws as any).subscribedEvents = events;

    ws.send(JSON.stringify({
      type: 'subscribed',
      events: events,
      timestamp: new Date().toISOString()
    }));

    logger.info(`Client ${ws.userId} subscribed to events:`, events);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      logger.info(`WebSocket client disconnected: ${ws.userId}`);
    } else {
      logger.info('Unauthenticated WebSocket client disconnected');
    }
  }

  /**
   * Send event to specific user
   */
  public async sendToUser(userId: string, event: GameEvent): Promise<void> {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      logger.debug(`No active WebSocket connections for user: ${userId}`);
      return;
    }

    const message = JSON.stringify({
      type: 'game_event',
      event: event
    });

    const deadConnections: AuthenticatedWebSocket[] = [];

    for (const client of userClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          // Check if client is subscribed to this event type
          const subscribedEvents = (client as any).subscribedEvents;
          if (!subscribedEvents || subscribedEvents.includes(event.type) || subscribedEvents.includes('all')) {
            client.send(message);
          }
        } catch (error) {
          logger.error(`Failed to send message to user ${userId}:`, error);
          deadConnections.push(client);
        }
      } else {
        deadConnections.push(client);
      }
    }

    // Clean up dead connections
    for (const deadClient of deadConnections) {
      userClients.delete(deadClient);
    }

    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  public async broadcast(event: GameEvent): Promise<void> {
    const message = JSON.stringify({
      type: 'game_event',
      event: event
    });

    let sentCount = 0;
    const deadConnections: { userId: string; client: AuthenticatedWebSocket }[] = [];

    for (const [userId, userClients] of this.clients.entries()) {
      for (const client of userClients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            const subscribedEvents = (client as any).subscribedEvents;
            if (!subscribedEvents || subscribedEvents.includes(event.type) || subscribedEvents.includes('all')) {
              client.send(message);
              sentCount++;
            }
          } catch (error) {
            logger.error(`Failed to broadcast to user ${userId}:`, error);
            deadConnections.push({ userId, client });
          }
        } else {
          deadConnections.push({ userId, client });
        }
      }
    }

    // Clean up dead connections
    for (const { userId, client } of deadConnections) {
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.delete(client);
        if (userClients.size === 0) {
          this.clients.delete(userId);
        }
      }
    }

    logger.info(`Broadcast sent to ${sentCount} clients`);
  }

  /**
   * Send notification to user
   */
  public async sendNotification(userId: string, notification: {
    title: string;
    message: string;
    type: string;
    data?: any;
  }): Promise<void> {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'notification',
      notification: {
        ...notification,
        timestamp: new Date().toISOString()
      }
    });

    for (const client of userClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          logger.error(`Failed to send notification to user ${userId}:`, error);
        }
      }
    }
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    connectionsPerUser: { [userId: string]: number };
  } {
    let totalConnections = 0;
    const connectionsPerUser: { [userId: string]: number } = {};

    for (const [userId, userClients] of this.clients.entries()) {
      const activeConnections = Array.from(userClients).filter(
        client => client.readyState === WebSocket.OPEN
      ).length;
      
      connectionsPerUser[userId] = activeConnections;
      totalConnections += activeConnections;
    }

    return {
      totalConnections,
      authenticatedUsers: this.clients.size,
      connectionsPerUser
    };
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          logger.info('Terminating dead WebSocket connection');
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    logger.info('WebSocket heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Shutdown WebSocket server
   */
  public shutdown(): void {
    this.stopHeartbeat();

    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });

      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
    }

    this.clients.clear();
  }
}