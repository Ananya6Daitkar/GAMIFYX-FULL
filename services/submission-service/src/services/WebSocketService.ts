import WebSocket from 'ws';
import { SubmissionStatusUpdate } from '@/models';
import { logger } from '@/telemetry/logger';
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('submission-service');
const meter = metrics.getMeter('submission-service', '1.0.0');

// Metrics
const wsConnections = meter.createUpDownCounter('websocket_connections_active', {
  description: 'Number of active WebSocket connections'
});

const wsMessages = meter.createCounter('websocket_messages_sent_total', {
  description: 'Total number of WebSocket messages sent'
});

export interface WebSocketClient {
  id: string;
  userId?: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  lastPing: Date;
}

export class WebSocketService {
  private clients: Map<string, WebSocketClient> = new Map();
  private server?: WebSocket.Server;
  private pingInterval?: NodeJS.Timeout;

  constructor() {
    this.setupWebSocketServer();
    this.startPingInterval();
  }

  private setupWebSocketServer(): void {
    const port = parseInt(process.env.WS_PORT || '3003');
    
    this.server = new WebSocket.Server({ 
      port,
      perMessageDeflate: false
    });

    this.server.on('connection', this.handleConnection.bind(this));
    
    logger.info('WebSocket server started', { port });
  }

  private handleConnection(socket: WebSocket, request: any): void {
    const span = tracer.startSpan('websocket_connection');
    const clientId = this.generateClientId();
    
    try {
      const client: WebSocketClient = {
        id: clientId,
        socket,
        subscriptions: new Set(),
        lastPing: new Date()
      };

      this.clients.set(clientId, client);
      wsConnections.add(1);

      span.setAttributes({
        'websocket.client_id': clientId,
        'websocket.total_clients': this.clients.size
      });

      // Setup message handlers
      socket.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      socket.on('close', () => {
        this.handleDisconnection(clientId);
      });

      socket.on('error', (error) => {
        logger.error('WebSocket error', { error, clientId });
        this.handleDisconnection(clientId);
      });

      socket.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = new Date();
        }
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        data: {
          clientId,
          message: 'Connected to submission status updates'
        }
      });

      span.setAttributes({ 'operation.success': true });
      
      logger.info('WebSocket client connected', { 
        clientId, 
        totalClients: this.clients.size 
      });

    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Failed to handle WebSocket connection', { error });
      socket.close();
    } finally {
      span.end();
    }
  }

  private handleMessage(clientId: string, data: WebSocket.Data): void {
    const span = tracer.startSpan('websocket_handle_message');
    
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const message = JSON.parse(data.toString());
      
      span.setAttributes({
        'websocket.client_id': clientId,
        'websocket.message_type': message.type
      });

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(clientId, message.data);
          break;
          
        case 'subscribe':
          this.handleSubscription(clientId, message.data);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data);
          break;
          
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } });
          break;
          
        default:
          logger.warn('Unknown WebSocket message type', { 
            type: message.type, 
            clientId 
          });
      }

      span.setAttributes({ 'operation.success': true });

    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Failed to handle WebSocket message', { 
        error, 
        clientId 
      });
    } finally {
      span.end();
    }
  }

  private handleAuthentication(clientId: string, authData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // In a real implementation, you'd validate the JWT token here
    // For now, we'll just store the userId
    client.userId = authData.userId;

    this.sendToClient(clientId, {
      type: 'authenticated',
      data: {
        userId: authData.userId,
        message: 'Authentication successful'
      }
    });

    logger.info('WebSocket client authenticated', { 
      clientId, 
      userId: authData.userId 
    });
  }

  private handleSubscription(clientId: string, subscriptionData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { submissionId, userId } = subscriptionData;
    
    // Subscribe to specific submission updates
    if (submissionId) {
      client.subscriptions.add(`submission:${submissionId}`);
    }
    
    // Subscribe to all submissions for a user
    if (userId) {
      client.subscriptions.add(`user:${userId}`);
    }

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: {
        subscriptions: Array.from(client.subscriptions)
      }
    });

    logger.info('WebSocket client subscribed', { 
      clientId, 
      subscriptions: Array.from(client.subscriptions)
    });
  }

  private handleUnsubscription(clientId: string, unsubscriptionData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { submissionId, userId } = unsubscriptionData;
    
    if (submissionId) {
      client.subscriptions.delete(`submission:${submissionId}`);
    }
    
    if (userId) {
      client.subscriptions.delete(`user:${userId}`);
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: {
        subscriptions: Array.from(client.subscriptions)
      }
    });

    logger.info('WebSocket client unsubscribed', { 
      clientId, 
      subscriptions: Array.from(client.subscriptions)
    });
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      wsConnections.add(-1);
      
      logger.info('WebSocket client disconnected', { 
        clientId, 
        totalClients: this.clients.size 
      });
    }
  }

  async sendStatusUpdate(statusUpdate: SubmissionStatusUpdate): Promise<void> {
    const span = tracer.startSpan('websocket_send_status_update');
    
    try {
      const { submissionId } = statusUpdate;
      let sentCount = 0;

      // Find clients subscribed to this submission or user
      for (const [clientId, client] of this.clients) {
        const shouldSend = 
          client.subscriptions.has(`submission:${submissionId}`) ||
          client.subscriptions.has(`user:${statusUpdate.submissionId}`); // This would need userId

        if (shouldSend && client.socket.readyState === WebSocket.OPEN) {
          this.sendToClient(clientId, {
            type: 'submission_status_update',
            data: statusUpdate
          });
          sentCount++;
        }
      }

      wsMessages.add(sentCount, { message_type: 'status_update' });

      span.setAttributes({
        'submission.id': submissionId,
        'websocket.clients_notified': sentCount,
        'operation.success': true
      });

      logger.debug('Status update sent to WebSocket clients', {
        submissionId,
        clientsNotified: sentCount,
        status: statusUpdate.status,
        progress: statusUpdate.progress
      });

    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Failed to send status update', { 
        error, 
        submissionId: statusUpdate.submissionId 
      });
    } finally {
      span.end();
    }
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send message to WebSocket client', { 
        error, 
        clientId 
      });
      this.handleDisconnection(clientId);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds

      for (const [clientId, client] of this.clients) {
        if (client.socket.readyState === WebSocket.OPEN) {
          // Check if client is still responsive
          if (now.getTime() - client.lastPing.getTime() > timeout) {
            logger.warn('WebSocket client timeout', { clientId });
            client.socket.terminate();
            this.handleDisconnection(clientId);
          } else {
            // Send ping
            client.socket.ping();
          }
        } else {
          this.handleDisconnection(clientId);
        }
      }
    }, 15000); // Check every 15 seconds
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async broadcast(message: any): Promise<void> {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, message);
        sentCount++;
      }
    }

    wsMessages.add(sentCount, { message_type: 'broadcast' });

    logger.info('Broadcast message sent', { 
      clientsNotified: sentCount,
      messageType: message.type 
    });
  }

  getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    totalSubscriptions: number;
  } {
    let authenticatedCount = 0;
    let totalSubscriptions = 0;

    for (const client of this.clients.values()) {
      if (client.userId) {
        authenticatedCount++;
      }
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedCount,
      totalSubscriptions
    };
  }

  async shutdown(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close();
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    logger.info('WebSocket service shut down');
  }
}