/**
 * Custom metrics definitions for GamifyX platform
 */

import { GamifyXTelemetry } from './index';

export class GamifyXMetrics {
  private telemetry: GamifyXTelemetry;
  
  // HTTP Metrics
  public httpRequestsTotal: any;
  public httpRequestDuration: any;
  public httpRequestsInFlight: any;
  
  // Business Metrics
  public usersActive: any;
  public achievementsUnlocked: any;
  public badgesEarned: any;
  public leaderboardUpdates: any;
  public submissionsProcessed: any;
  public feedbackGenerated: any;
  
  // System Metrics
  public databaseConnections: any;
  public cacheHits: any;
  public cacheMisses: any;
  public queueSize: any;
  public processingTime: any;
  
  // WebSocket Metrics
  public websocketConnections: any;
  public websocketMessages: any;
  public websocketErrors: any;
  
  // AI/ML Metrics
  public aiPredictions: any;
  public aiPredictionLatency: any;
  public aiModelAccuracy: any;
  public incidentsPredicted: any;
  
  // Security Metrics
  public authenticationAttempts: any;
  public authenticationFailures: any;
  public securityScans: any;
  public vulnerabilitiesFound: any;

  constructor(telemetry: GamifyXTelemetry) {
    this.telemetry = telemetry;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // HTTP Metrics
    this.httpRequestsTotal = this.telemetry.createCounter(
      'gamifyx_http_requests_total',
      'Total number of HTTP requests',
      'requests'
    );

    this.httpRequestDuration = this.telemetry.createHistogram(
      'gamifyx_http_request_duration_seconds',
      'HTTP request duration in seconds',
      'seconds'
    );

    this.httpRequestsInFlight = this.telemetry.createGauge(
      'gamifyx_http_requests_in_flight',
      'Current number of HTTP requests being processed',
      'requests'
    );

    // Business Metrics
    this.usersActive = this.telemetry.createGauge(
      'gamifyx_users_active_total',
      'Number of currently active users',
      'users'
    );

    this.achievementsUnlocked = this.telemetry.createCounter(
      'gamifyx_achievements_unlocked_total',
      'Total number of achievements unlocked',
      'achievements'
    );

    this.badgesEarned = this.telemetry.createCounter(
      'gamifyx_badges_earned_total',
      'Total number of badges earned',
      'badges'
    );

    this.leaderboardUpdates = this.telemetry.createCounter(
      'gamifyx_leaderboard_updates_total',
      'Total number of leaderboard updates',
      'updates'
    );

    this.submissionsProcessed = this.telemetry.createCounter(
      'gamifyx_submissions_processed_total',
      'Total number of submissions processed',
      'submissions'
    );

    this.feedbackGenerated = this.telemetry.createCounter(
      'gamifyx_feedback_generated_total',
      'Total amount of feedback generated',
      'feedback_items'
    );

    // System Metrics
    this.databaseConnections = this.telemetry.createGauge(
      'gamifyx_database_connections_active',
      'Number of active database connections',
      'connections'
    );

    this.cacheHits = this.telemetry.createCounter(
      'gamifyx_cache_hits_total',
      'Total number of cache hits',
      'hits'
    );

    this.cacheMisses = this.telemetry.createCounter(
      'gamifyx_cache_misses_total',
      'Total number of cache misses',
      'misses'
    );

    this.queueSize = this.telemetry.createGauge(
      'gamifyx_queue_size',
      'Current size of processing queues',
      'items'
    );

    this.processingTime = this.telemetry.createHistogram(
      'gamifyx_processing_time_seconds',
      'Time taken to process various operations',
      'seconds'
    );

    // WebSocket Metrics
    this.websocketConnections = this.telemetry.createGauge(
      'gamifyx_websocket_connections_active',
      'Number of active WebSocket connections',
      'connections'
    );

    this.websocketMessages = this.telemetry.createCounter(
      'gamifyx_websocket_messages_total',
      'Total number of WebSocket messages sent',
      'messages'
    );

    this.websocketErrors = this.telemetry.createCounter(
      'gamifyx_websocket_errors_total',
      'Total number of WebSocket errors',
      'errors'
    );

    // AI/ML Metrics
    this.aiPredictions = this.telemetry.createCounter(
      'gamifyx_ai_predictions_total',
      'Total number of AI predictions made',
      'predictions'
    );

    this.aiPredictionLatency = this.telemetry.createHistogram(
      'gamifyx_ai_prediction_duration_seconds',
      'Time taken for AI predictions',
      'seconds'
    );

    this.aiModelAccuracy = this.telemetry.createGauge(
      'gamifyx_ai_model_accuracy',
      'Current accuracy of AI models',
      'percentage'
    );

    this.incidentsPredicted = this.telemetry.createCounter(
      'gamifyx_incidents_predicted_total',
      'Total number of incidents predicted',
      'incidents'
    );

    // Security Metrics
    this.authenticationAttempts = this.telemetry.createCounter(
      'gamifyx_authentication_attempts_total',
      'Total number of authentication attempts',
      'attempts'
    );

    this.authenticationFailures = this.telemetry.createCounter(
      'gamifyx_authentication_failures_total',
      'Total number of authentication failures',
      'failures'
    );

    this.securityScans = this.telemetry.createCounter(
      'gamifyx_security_scans_total',
      'Total number of security scans performed',
      'scans'
    );

    this.vulnerabilitiesFound = this.telemetry.createCounter(
      'gamifyx_vulnerabilities_found_total',
      'Total number of vulnerabilities found',
      'vulnerabilities'
    );
  }

  // Helper methods for common metric operations
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestsTotal.add(1, labels);
    this.httpRequestDuration.record(duration / 1000, labels); // Convert to seconds
  }

  public recordAchievementUnlocked(userId: string, achievementId: string, rarity: string): void {
    this.achievementsUnlocked.add(1, { user_id: userId, achievement_id: achievementId, rarity });
  }

  public recordBadgeEarned(userId: string, badgeId: string, category: string): void {
    this.badgesEarned.add(1, { user_id: userId, badge_id: badgeId, category });
  }

  public recordSubmissionProcessed(userId: string, submissionType: string, status: string, processingTime: number): void {
    this.submissionsProcessed.add(1, { user_id: userId, type: submissionType, status });
    this.processingTime.record(processingTime / 1000, { operation: 'submission_processing' });
  }

  public recordAIPrediction(predictionType: string, confidence: number, latency: number): void {
    this.aiPredictions.add(1, { type: predictionType });
    this.aiPredictionLatency.record(latency / 1000, { type: predictionType });
    this.aiModelAccuracy.record(confidence, { type: predictionType });
  }

  public recordWebSocketConnection(action: 'connect' | 'disconnect', userId?: string): void {
    if (action === 'connect') {
      // This would typically be handled by a gauge callback
      this.websocketMessages.add(1, { type: 'connection', user_id: userId || 'anonymous' });
    }
  }

  public recordWebSocketMessage(messageType: string, userId?: string): void {
    this.websocketMessages.add(1, { type: messageType, user_id: userId || 'anonymous' });
  }

  public recordAuthenticationAttempt(success: boolean, method: string, userId?: string): void {
    this.authenticationAttempts.add(1, { method, user_id: userId || 'anonymous' });
    if (!success) {
      this.authenticationFailures.add(1, { method, user_id: userId || 'anonymous' });
    }
  }

  public recordSecurityScan(scanType: string, vulnerabilitiesCount: number): void {
    this.securityScans.add(1, { type: scanType });
    if (vulnerabilitiesCount > 0) {
      this.vulnerabilitiesFound.add(vulnerabilitiesCount, { type: scanType });
    }
  }

  public recordCacheOperation(operation: 'hit' | 'miss', cacheType: string): void {
    if (operation === 'hit') {
      this.cacheHits.add(1, { type: cacheType });
    } else {
      this.cacheMisses.add(1, { type: cacheType });
    }
  }

  public updateActiveUsers(count: number): void {
    // This would typically be called periodically to update the gauge
    this.usersActive.record(count);
  }

  public updateQueueSize(queueName: string, size: number): void {
    this.queueSize.record(size, { queue: queueName });
  }

  public updateDatabaseConnections(count: number): void {
    this.databaseConnections.record(count);
  }
}

export default GamifyXMetrics;