import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { RealTimeService, RealTimeEvent } from './realTimeService';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  refreshThreshold: number; // Percentage of TTL when to refresh (0-1)
  maxSize?: number; // Maximum cache size
}

export interface EventHandler {
  eventType: string;
  handler: (event: any) => Promise<void>;
  priority: number; // Higher number = higher priority
}

/**
 * Event-Driven Service
 * Handles event processing, caching, and performance optimization
 */
export class EventDrivenService {
  private static instance: EventDrivenService;
  private realTimeService: RealTimeService;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private cacheConfigs: Map<string, CacheConfig> = new Map();
  private processingQueue: Array<{ event: any; priority: number; timestamp: Date }> = [];
  private isProcessing = false;

  private constructor() {
    this.realTimeService = RealTimeService.getInstance();
    this.setupDefaultCacheConfigs();
    this.setupDefaultEventHandlers();
  }

  public static getInstance(): EventDrivenService {
    if (!EventDrivenService.instance) {
      EventDrivenService.instance = new EventDrivenService();
    }
    return EventDrivenService.instance;
  }

  /**
   * Setup default cache configurations
   */
  private setupDefaultCacheConfigs(): void {
    this.cacheConfigs.set('student_pr_stats', {
      ttl: 1800, // 30 minutes
      refreshThreshold: 0.8
    });

    this.cacheConfigs.set('class_pr_overview', {
      ttl: 900, // 15 minutes
      refreshThreshold: 0.7
    });

    this.cacheConfigs.set('progress_analysis', {
      ttl: 3600, // 1 hour
      refreshThreshold: 0.8
    });

    this.cacheConfigs.set('pr_trends', {
      ttl: 1800, // 30 minutes
      refreshThreshold: 0.75
    });
  }

  /**
   * Setup default event handlers
   */
  private setupDefaultEventHandlers(): void {
    // PR update handler
    this.registerEventHandler('pr_update', async (event) => {
      await this.handlePRUpdate(event);
    }, 10);

    // Progress update handler
    this.registerEventHandler('progress_update', async (event) => {
      await this.handleProgressUpdate(event);
    }, 8);

    // Sync status handler
    this.registerEventHandler('sync_status', async (event) => {
      await this.handleSyncStatus(event);
    }, 5);

    // Cache invalidation handler
    this.registerEventHandler('cache_invalidate', async (event) => {
      await this.handleCacheInvalidation(event);
    }, 15);
  }

  /**
   * Register an event handler
   */
  public registerEventHandler(eventType: string, handler: (event: any) => Promise<void>, priority: number = 5): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.push({ eventType, handler, priority });
    
    // Sort by priority (highest first)
    handlers.sort((a, b) => b.priority - a.priority);

    logger.debug(`Registered event handler for ${eventType} with priority ${priority}`);
  }

  /**
   * Process an event through registered handlers
   */
  public async processEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const handlers = this.eventHandlers.get(eventType) || [];
      
      if (handlers.length === 0) {
        logger.debug(`No handlers registered for event type: ${eventType}`);
        return;
      }

      // Add to processing queue
      this.processingQueue.push({
        event: { type: eventType, data: eventData },
        priority: Math.max(...handlers.map(h => h.priority)),
        timestamp: new Date()
      });

      // Sort queue by priority
      this.processingQueue.sort((a, b) => b.priority - a.priority);

      // Start processing if not already running
      if (!this.isProcessing) {
        await this.processQueue();
      }

    } catch (error) {
      logger.error(`Error processing event ${eventType}:`, error);
    }
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const queueItem = this.processingQueue.shift()!;
        const { event } = queueItem;
        const handlers = this.eventHandlers.get(event.type) || [];

        // Execute all handlers for this event type
        await Promise.all(
          handlers.map(async (handlerInfo) => {
            try {
              await handlerInfo.handler(event.data);
            } catch (error) {
              logger.error(`Error in event handler for ${event.type}:`, error);
            }
          })
        );
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle PR update events
   */
  private async handlePRUpdate(event: any): Promise<void> {
    try {
      const { teacherId, studentId, prData } = event;

      // Invalidate related caches
      await this.invalidateCache(`student_pr_stats:${studentId}`);
      await this.invalidateCache(`class_pr_overview:${teacherId}`);
      await this.invalidateCache(`pr_trends:${teacherId}`);

      // Broadcast real-time update
      const realTimeEvent: RealTimeEvent = {
        type: 'pr_update',
        teacherId,
        studentId,
        data: prData,
        timestamp: new Date()
      };

      this.realTimeService.broadcastEvent(realTimeEvent);

      logger.debug(`Processed PR update for student ${studentId}`);

    } catch (error) {
      logger.error('Error handling PR update:', error);
    }
  }

  /**
   * Handle progress update events
   */
  private async handleProgressUpdate(event: any): Promise<void> {
    try {
      const { teacherId, studentId, progressData } = event;

      // Cache the progress data
      await this.setCachedData(
        `progress_analysis:${studentId}`,
        progressData,
        'progress_analysis'
      );

      // Broadcast real-time update
      const realTimeEvent: RealTimeEvent = {
        type: 'progress_update',
        teacherId,
        studentId,
        data: progressData,
        timestamp: new Date()
      };

      this.realTimeService.broadcastEvent(realTimeEvent);

      logger.debug(`Processed progress update for student ${studentId}`);

    } catch (error) {
      logger.error('Error handling progress update:', error);
    }
  }

  /**
   * Handle sync status events
   */
  private async handleSyncStatus(event: any): Promise<void> {
    try {
      const { teacherId, status, studentsProcessed, prsFound } = event;

      // Broadcast sync status
      const realTimeEvent: RealTimeEvent = {
        type: 'sync_status',
        teacherId,
        data: {
          status,
          studentsProcessed,
          prsFound,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      this.realTimeService.broadcastEvent(realTimeEvent);

      logger.debug(`Processed sync status for teacher ${teacherId}: ${status}`);

    } catch (error) {
      logger.error('Error handling sync status:', error);
    }
  }

  /**
   * Handle cache invalidation events
   */
  private async handleCacheInvalidation(event: any): Promise<void> {
    try {
      const { cacheKeys, pattern } = event;

      if (cacheKeys && Array.isArray(cacheKeys)) {
        for (const key of cacheKeys) {
          await this.invalidateCache(key);
        }
      }

      if (pattern) {
        // Would need Redis SCAN implementation for pattern-based invalidation
        logger.debug(`Cache invalidation pattern: ${pattern}`);
      }

    } catch (error) {
      logger.error('Error handling cache invalidation:', error);
    }
  }

  /**
   * Handle real-time PR update events
   */
  public async handlePRUpdateEvent(event: {
    type: 'pr_created' | 'pr_updated' | 'pr_merged' | 'pr_closed';
    studentId: string;
    teacherId: string;
    prData: any;
  }): Promise<void> {
    try {
      logger.info(`Handling PR update event: ${event.type} for student ${event.studentId}`);

      // Invalidate related caches
      await this.invalidateCache(`student_pr_data:${event.studentId}:${event.teacherId}`);
      await this.invalidateCache(`class_pr_overview:${event.teacherId}`);
      await this.invalidateCache(`pr_trends:${event.teacherId}`);

      // Broadcast real-time update
      const realTimeEvent = {
        type: 'pr_update' as const,
        teacherId: event.teacherId,
        studentId: event.studentId,
        data: {
          action: event.type,
          pr: event.prData,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      };

      this.realTimeService.broadcastEvent(realTimeEvent);

      // Trigger progress analysis update
      await this.triggerProgressAnalysisUpdate(event.studentId, event.teacherId);

    } catch (error) {
      logger.error('Error handling PR update event:', error);
    }
  }

  /**
   * Handle sync completion events
   */
  public async handleSyncCompletionEvent(event: {
    teacherId: string;
    studentsProcessed: number;
    prsFound: number;
    duration: number;
  }): Promise<void> {
    try {
      logger.info(`Handling sync completion for teacher ${event.teacherId}`);

      // Invalidate all class caches
      await this.invalidateCache(`class_pr_overview:${event.teacherId}`);
      await this.invalidateCache(`pr_trends:${event.teacherId}`);

      // Broadcast sync completion
      const realTimeEvent = {
        type: 'sync_status' as const,
        teacherId: event.teacherId,
        data: {
          status: 'completed',
          studentsProcessed: event.studentsProcessed,
          prsFound: event.prsFound,
          duration: event.duration,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      };

      this.realTimeService.broadcastEvent(realTimeEvent);

    } catch (error) {
      logger.error('Error handling sync completion event:', error);
    }
  }

  /**
   * Trigger progress analysis update
   */
  private async triggerProgressAnalysisUpdate(studentId: string, teacherId: string): Promise<void> {
    try {
      // This would trigger the progress analysis engine
      // For now, just log the request
      logger.info(`Progress analysis requested for student ${studentId} by teacher ${teacherId}`);

    } catch (error) {
      logger.error('Error triggering progress analysis update:', error);
    }
  }

  /**
   * Get cached data with automatic refresh
   */
  public async getCachedData<T>(key: string, cacheType: string): Promise<T | null> {
    try {
      const cached = await db.cacheGet<{ data: T; cachedAt: number; ttl: number }>(key);
      
      if (!cached) {
        return null;
      }

      const config = this.cacheConfigs.get(cacheType);
      if (!config) {
        return cached.data;
      }

      // Check if cache needs refresh
      const age = (Date.now() - cached.cachedAt) / 1000;
      const refreshTime = config.ttl * config.refreshThreshold;

      if (age > refreshTime) {
        // Trigger background refresh
        this.triggerCacheRefresh(key, cacheType);
      }

      return cached.data;

    } catch (error) {
      logger.error(`Error getting cached data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  public async setCachedData(key: string, data: any, cacheType: string): Promise<void> {
    try {
      const config = this.cacheConfigs.get(cacheType);
      const ttl = config?.ttl || 3600;

      const cacheData = {
        data,
        cachedAt: Date.now(),
        ttl
      };

      await db.cacheSet(key, cacheData, ttl);

    } catch (error) {
      logger.error(`Error setting cached data for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache
   */
  public async invalidateCache(key: string): Promise<void> {
    try {
      await db.cacheDel(key);
      logger.debug(`Invalidated cache key: ${key}`);
    } catch (error) {
      logger.error(`Error invalidating cache key ${key}:`, error);
    }
  }

  /**
   * Trigger cache refresh in background
   */
  private triggerCacheRefresh(key: string, cacheType: string): void {
    // This would trigger appropriate service methods to refresh the cache
    // Implementation depends on the specific cache type
    logger.debug(`Triggering background refresh for cache key: ${key} (type: ${cacheType})`);
    
    // Example: trigger refresh based on cache type
    setTimeout(async () => {
      try {
        if (cacheType === 'student_pr_stats') {
          // Would trigger student PR stats refresh
        } else if (cacheType === 'class_pr_overview') {
          // Would trigger class overview refresh
        }
      } catch (error) {
        logger.error(`Error refreshing cache ${key}:`, error);
      }
    }, 0);
  }

  /**
   * Publish event to Redis for cross-service communication
   */
  public async publishEvent(channel: string, event: any): Promise<void> {
    try {
      await db.publishEvent(channel, event);
      logger.debug(`Published event to channel ${channel}`);
    } catch (error) {
      logger.error(`Error publishing event to channel ${channel}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
    topKeys: Array<{ key: string; size: number; ttl: number }>;
  }> {
    try {
      // This would need Redis INFO and SCAN commands
      // For now, return mock data
      return {
        totalKeys: 0,
        hitRate: 0.85,
        memoryUsage: 0,
        topKeys: []
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        hitRate: 0,
        memoryUsage: 0,
        topKeys: []
      };
    }
  }
}