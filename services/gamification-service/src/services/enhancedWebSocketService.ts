/**
 * Enhanced WebSocket Service with room-based communication and team collaboration
 */

import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../telemetry/logger';
import { GameEvent } from '../models';

export interface EnhancedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
  rooms?: Set<string>;
  subscribedEvents?: string[];
  metadata?: Record<string, any>;
  lastActivity?: Date;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  members: Set<string>;
  metadata: Record<string, any>;
  createdAt: Date;
  isPrivate: boolean;
  maxMembers?: number;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  roomId?: string;
  targetUserId?: string;
  timestamp?: string;
  messageId?: string;
}

export interface CollaborationSession {
  id: string;
  roomId: string;
  type: 'code_review' | 'pair_programming' | 'study_group' | 'team_project';
  participants: string[];
  sharedState: any;
  createdAt: Date;
  lastActivity: Date;
}

export enum RoomType {
  GLOBAL = 'global',
  TEAM = 'team',
  CLASS = 'class',
  STUDY_GROUP = 'study_group',
  COLLABORATION = 'collaboration',
  LEADERBOARD = 'leaderboard',
  NOTIFICATIONS = 'notifications'
}

export class EnhancedWebSocketService {
  private static instance: EnhancedWebSocketService;
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, Set<EnhancedWebSocket>> = new Map();
  private rooms: Map<string, Room> = new Map();
  private collaborationSessions: Map<string, CollaborationSession> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultRooms();
  }

  public static getInstance(): EnhancedWebSocketService {
    if (!EnhancedWebSocketService.instance) {
      EnhancedWebSocketService.instance = new EnhancedWebSocketService();
    }
    return EnhancedWebSocketService.instance;
  }

  /**
   * Initialize WebSocket server with enhanced features
   */
  public initialize(server: any): void {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/enhanced'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    this.startCleanupTasks();

    logger.info('Enhanced WebSocket server initialized');
  }

  /**
   * Initialize default rooms
   */
  private initializeDefaultRooms(): void {
    const defaultRooms = [
      { id: 'global', name: 'Global Chat', type: RoomType.GLOBAL },
      { id: 'leaderboard', name: 'Leaderboard Updates', type: RoomType.LEADERBOARD },
      { id: 'notifications', name: 'System Notifications', type: RoomType.NOTIFICATIONS }
    ];

    for (const roomData of defaultRooms) {
      this.rooms.set(roomData.id, {
        ...roomData,
        members: new Set(),
        metadata: {},
        createdAt: new Date(),
        isPrivate: false
      });
    }
  }

  // Continue with more methods in next part due to length limit...
}  /
**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: EnhancedWebSocket, request: IncomingMessage): void {
    logger.info('New enhanced WebSocket connection established');

    ws.isAlive = true;
    ws.rooms = new Set();
    ws.lastActivity = new Date();

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActivity = new Date();
    });

    // Handle incoming messages
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        message.timestamp = new Date().toISOString();
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
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
    this.sendMessage(ws, {
      type: 'welcome',
      data: {
        message: 'Connected to enhanced WebSocket service',
        availableRooms: Array.from(this.rooms.values()).filter(r => !r.isPrivate).map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          memberCount: r.members.size
        }))
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: EnhancedWebSocket, message: WebSocketMessage): void {
    ws.lastActivity = new Date();

    switch (message.type) {
      case 'authenticate':
        this.authenticateClient(ws, message.data);
        break;

      case 'join_room':
        this.joinRoom(ws, message.data.roomId, message.data.password);
        break;

      case 'leave_room':
        this.leaveRoom(ws, message.data.roomId);
        break;

      case 'create_room':
        this.createRoom(ws, message.data);
        break;

      case 'send_message':
        this.handleChatMessage(ws, message);
        break;

      case 'start_collaboration':
        this.startCollaboration(ws, message.data);
        break;

      case 'collaboration_update':
        this.handleCollaborationUpdate(ws, message);
        break;

      case 'subscribe_events':
        this.subscribeToEvents(ws, message.data.events);
        break;

      case 'user_presence':
        this.updateUserPresence(ws, message.data);
        break;

      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;

      default:
        logger.warn('Unknown WebSocket message type:', message.type);
        this.sendError(ws, 'Unknown message type');
    }
  }

  /**
   * Authenticate WebSocket client
   */
  private authenticateClient(ws: EnhancedWebSocket, authData: any): void {
    const { userId, username, token } = authData;

    if (!userId || !username) {
      this.sendError(ws, 'User ID and username required');
      return;
    }

    // In a real implementation, validate the token
    ws.userId = userId;
    ws.username = username;

    // Add to clients map
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    // Auto-join global room
    this.joinRoom(ws, 'global');

    this.sendMessage(ws, {
      type: 'authenticated',
      data: {
        userId,
        username,
        joinedRooms: Array.from(ws.rooms || [])
      }
    });

    // Notify others of user presence
    this.broadcastToRoom('global', {
      type: 'user_joined',
      data: { userId, username }
    }, userId);

    logger.info(`Enhanced WebSocket client authenticated: ${userId} (${username})`);
  }

  /**
   * Join a room
   */
  public async joinRoom(ws: EnhancedWebSocket, roomId: string, password?: string): Promise<void> {
    if (!ws.userId) {
      this.sendError(ws, 'Authentication required');
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.sendError(ws, `Room ${roomId} not found`);
      return;
    }

    // Check room capacity
    if (room.maxMembers && room.members.size >= room.maxMembers) {
      this.sendError(ws, 'Room is full');
      return;
    }

    // Check password for private rooms
    if (room.isPrivate && room.metadata.password !== password) {
      this.sendError(ws, 'Invalid room password');
      return;
    }

    // Add user to room
    room.members.add(ws.userId);
    ws.rooms?.add(roomId);

    this.sendMessage(ws, {
      type: 'room_joined',
      data: {
        roomId,
        roomName: room.name,
        memberCount: room.members.size,
        members: Array.from(room.members)
      }
    });

    // Notify other room members
    this.broadcastToRoom(roomId, {
      type: 'user_joined_room',
      data: {
        userId: ws.userId,
        username: ws.username,
        roomId,
        memberCount: room.members.size
      }
    }, ws.userId);

    logger.info(`User ${ws.userId} joined room ${roomId}`);
  }

  /**
   * Leave a room
   */
  public async leaveRoom(ws: EnhancedWebSocket, roomId: string): Promise<void> {
    if (!ws.userId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.members.delete(ws.userId);
    ws.rooms?.delete(roomId);

    this.sendMessage(ws, {
      type: 'room_left',
      data: { roomId, memberCount: room.members.size }
    });

    // Notify other room members
    this.broadcastToRoom(roomId, {
      type: 'user_left_room',
      data: {
        userId: ws.userId,
        username: ws.username,
        roomId,
        memberCount: room.members.size
      }
    }, ws.userId);

    logger.info(`User ${ws.userId} left room ${roomId}`);
  }

  /**
   * Create a new room
   */
  private createRoom(ws: EnhancedWebSocket, roomData: any): void {
    if (!ws.userId) {
      this.sendError(ws, 'Authentication required');
      return;
    }

    const { name, type, isPrivate, password, maxMembers } = roomData;
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: Room = {
      id: roomId,
      name,
      type: type || RoomType.STUDY_GROUP,
      members: new Set([ws.userId]),
      metadata: { creator: ws.userId, password },
      createdAt: new Date(),
      isPrivate: !!isPrivate,
      maxMembers
    };

    this.rooms.set(roomId, room);
    ws.rooms?.add(roomId);

    this.sendMessage(ws, {
      type: 'room_created',
      data: {
        roomId,
        name,
        type: room.type,
        memberCount: 1
      }
    });

    logger.info(`User ${ws.userId} created room ${roomId}: ${name}`);
  }

  /**
   * Handle chat messages
   */
  private handleChatMessage(ws: EnhancedWebSocket, message: WebSocketMessage): void {
    if (!ws.userId || !message.roomId) {
      this.sendError(ws, 'User ID and room ID required');
      return;
    }

    const room = this.rooms.get(message.roomId);
    if (!room || !room.members.has(ws.userId)) {
      this.sendError(ws, 'Not a member of this room');
      return;
    }

    const chatMessage = {
      type: 'chat_message',
      data: {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomId: message.roomId,
        userId: ws.userId,
        username: ws.username,
        content: message.data.content,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcastToRoom(message.roomId, chatMessage);
    logger.info(`Chat message in room ${message.roomId} from ${ws.userId}`);
  }

  /**
   * Start collaboration session
   */
  private startCollaboration(ws: EnhancedWebSocket, data: any): void {
    if (!ws.userId) {
      this.sendError(ws, 'Authentication required');
      return;
    }

    const { roomId, type, participants } = data;
    const sessionId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: CollaborationSession = {
      id: sessionId,
      roomId,
      type,
      participants: [ws.userId, ...participants],
      sharedState: {},
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.collaborationSessions.set(sessionId, session);

    // Notify all participants
    for (const participantId of session.participants) {
      this.sendToUser(participantId, {
        type: 'collaboration_started',
        data: {
          sessionId,
          roomId,
          type,
          participants: session.participants,
          initiator: ws.userId
        }
      });
    }

    logger.info(`Collaboration session ${sessionId} started by ${ws.userId}`);
  }

  /**
   * Handle collaboration updates
   */
  private handleCollaborationUpdate(ws: EnhancedWebSocket, message: WebSocketMessage): void {
    if (!ws.userId || !message.data.sessionId) return;

    const session = this.collaborationSessions.get(message.data.sessionId);
    if (!session || !session.participants.includes(ws.userId)) {
      this.sendError(ws, 'Invalid collaboration session');
      return;
    }

    session.lastActivity = new Date();
    session.sharedState = { ...session.sharedState, ...message.data.updates };

    // Broadcast update to all participants except sender
    for (const participantId of session.participants) {
      if (participantId !== ws.userId) {
        this.sendToUser(participantId, {
          type: 'collaboration_update',
          data: {
            sessionId: session.id,
            updates: message.data.updates,
            updatedBy: ws.userId,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * Subscribe to event types
   */
  private subscribeToEvents(ws: EnhancedWebSocket, events: string[]): void {
    if (!ws.userId) {
      this.sendError(ws, 'Authentication required');
      return;
    }

    ws.subscribedEvents = events;

    this.sendMessage(ws, {
      type: 'events_subscribed',
      data: { events }
    });

    logger.info(`Client ${ws.userId} subscribed to events:`, events);
  }

  /**
   * Update user presence
   */
  private updateUserPresence(ws: EnhancedWebSocket, presenceData: any): void {
    if (!ws.userId) return;

    ws.metadata = { ...ws.metadata, presence: presenceData };

    // Broadcast presence update to all rooms user is in
    for (const roomId of ws.rooms || []) {
      this.broadcastToRoom(roomId, {
        type: 'user_presence_update',
        data: {
          userId: ws.userId,
          presence: presenceData,
          timestamp: new Date().toISOString()
        }
      }, ws.userId);
    }
  }

  /**
   * Send message to specific user
   */
  public async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      logger.debug(`No active connections for user: ${userId}`);
      return;
    }

    const messageStr = JSON.stringify(message);
    const deadConnections: EnhancedWebSocket[] = [];

    for (const client of userClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error(`Failed to send message to user ${userId}:`, error);
          deadConnections.push(client);
        }
      } else {
        deadConnections.push(client);
      }
    }

    this.cleanupDeadConnections(userId, deadConnections);
  }

  /**
   * Send message to team
   */
  public async sendToTeam(teamId: string, message: WebSocketMessage): Promise<void> {
    const teamRoomId = `team_${teamId}`;
    await this.broadcastToRoom(teamRoomId, message);
  }

  /**
   * Broadcast to room
   */
  public async broadcastToRoom(roomId: string, message: WebSocketMessage, excludeUserId?: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Attempted to broadcast to non-existent room: ${roomId}`);
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    for (const memberId of room.members) {
      if (excludeUserId && memberId === excludeUserId) continue;

      const userClients = this.clients.get(memberId);
      if (!userClients) continue;

      for (const client of userClients) {
        if (client.readyState === WebSocket.OPEN && client.rooms?.has(roomId)) {
          try {
            client.send(messageStr);
            sentCount++;
          } catch (error) {
            logger.error(`Failed to broadcast to user ${memberId}:`, error);
          }
        }
      }
    }

    logger.debug(`Broadcast to room ${roomId}: ${sentCount} recipients`);
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(ws: EnhancedWebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send WebSocket message:', error);
      }
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: EnhancedWebSocket, errorMessage: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: errorMessage }
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: EnhancedWebSocket): void {
    if (ws.userId) {
      // Remove from all rooms
      for (const roomId of ws.rooms || []) {
        const room = this.rooms.get(roomId);
        if (room) {
          room.members.delete(ws.userId);
          
          // Notify room members
          this.broadcastToRoom(roomId, {
            type: 'user_left_room',
            data: {
              userId: ws.userId,
              username: ws.username,
              roomId,
              memberCount: room.members.size
            }
          }, ws.userId);
        }
      }

      // Remove from clients map
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }

      logger.info(`Enhanced WebSocket client disconnected: ${ws.userId}`);
    }
  }

  /**
   * Clean up dead connections
   */
  private cleanupDeadConnections(userId: string, deadConnections: EnhancedWebSocket[]): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    for (const deadClient of deadConnections) {
      userClients.delete(deadClient);
    }

    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: EnhancedWebSocket) => {
        if (ws.isAlive === false) {
          logger.info('Terminating dead WebSocket connection');
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    logger.info('Enhanced WebSocket heartbeat started');
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveCollaborations();
      this.cleanupEmptyRooms();
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('WebSocket cleanup tasks started');
  }

  /**
   * Clean up inactive collaborations
   */
  private cleanupInactiveCollaborations(): void {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    for (const [sessionId, session] of this.collaborationSessions) {
      if (session.lastActivity < cutoffTime) {
        this.collaborationSessions.delete(sessionId);
        logger.info(`Cleaned up inactive collaboration session: ${sessionId}`);
      }
    }
  }

  /**
   * Clean up empty rooms
   */
  private cleanupEmptyRooms(): void {
    const defaultRooms = new Set(['global', 'leaderboard', 'notifications']);

    for (const [roomId, room] of this.rooms) {
      if (!defaultRooms.has(roomId) && room.members.size === 0) {
        this.rooms.delete(roomId);
        logger.info(`Cleaned up empty room: ${roomId}`);
      }
    }
  }

  /**
   * Get connection statistics
   */
  public getStats(): any {
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
      totalRooms: this.rooms.size,
      activeCollaborations: this.collaborationSessions.size,
      connectionsPerUser,
      roomStats: Array.from(this.rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        memberCount: room.members.size,
        isPrivate: room.isPrivate
      }))
    };
  }

  /**
   * Shutdown enhanced WebSocket service
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });

      this.wss.close(() => {
        logger.info('Enhanced WebSocket server closed');
      });
    }

    this.clients.clear();
    this.rooms.clear();
    this.collaborationSessions.clear();
  }
}