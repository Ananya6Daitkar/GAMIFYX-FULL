import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: number;
}

export class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
    this.startPingInterval();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = uuidv4();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error(`Invalid WebSocket message from ${clientId}:`, error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(clientId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });

      // Send welcome message
      this.sendMessage(clientId, {
        type: 'connection',
        data: { clientId, status: 'connected' }
      });
    });
  }

  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

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
        this.sendMessage(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        logger.warn(`Unknown message type from ${clientId}: ${message.type}`);
        this.sendError(clientId, 'Unknown message type');
    }
  }

  private handleAuthentication(clientId: string, data: { userId: string; token?: string }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // In a real implementation, you would validate the token here
    // For now, we'll just accept the userId
    client.userId = data.userId;

    // Track user connections
    if (!this.userConnections.has(data.userId)) {
      this.userConnections.set(data.userId, new Set());
    }
    this.userConnections.get(data.userId)!.add(clientId);

    logger.info(`Client ${clientId} authenticated as user ${data.userId}`);
    this.sendMessage(clientId, {
      type: 'authenticated',
      data: { userId: data.userId, status: 'success' }
    });
  }

  private handleSubscription(clientId: string, data: { channels: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    data.channels.forEach(channel => {
      client.subscriptions.add(channel);
    });

    logger.info(`Client ${clientId} subscribed to channels: ${data.channels.join(', ')}`);
    this.sendMessage(clientId, {
      type: 'subscribed',
      data: { channels: data.channels }
    });
  }

  private handleUnsubscription(clientId: string, data: { channels: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    data.channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    logger.info(`Client ${clientId} unsubscribed from channels: ${data.channels.join(', ')}`);
    this.sendMessage(clientId, {
      type: 'unsubscribed',
      data: { channels: data.channels }
    });
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from user connections
    if (client.userId) {
      const userClients = this.userConnections.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }

    this.clients.delete(clientId);
    logger.info(`WebSocket client disconnected: ${clientId}`);
  }

  private sendMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}:`, error);
    }
  }

  private sendError(clientId: string, error: string): void {
    this.sendMessage(clientId, {
      type: 'error',
      data: { message: error, timestamp: Date.now() }
    });
  }

  // Public methods for broadcasting messages
  public broadcastToUser(userId: string, message: any): void {
    const userClients = this.userConnections.get(userId);
    if (!userClients) return;

    userClients.forEach(clientId => {
      this.sendMessage(clientId, message);
    });
  }

  public broadcastToChannel(channel: string, message: any): void {
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        this.sendMessage(clientId, message);
      }
    });
  }

  public broadcastToAll(message: any): void {
    this.clients.forEach((client, clientId) => {
      this.sendMessage(clientId, message);
    });
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > timeout) {
          logger.warn(`Client ${clientId} ping timeout, disconnecting`);
          client.ws.terminate();
          this.handleDisconnection(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, 30000); // Check every 30 seconds
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.clients.clear();
    this.userConnections.clear();
  }
}