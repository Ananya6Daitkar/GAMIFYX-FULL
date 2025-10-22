/**
 * WebSocket service for real-time updates
 */

import { io, Socket } from 'socket.io-client';
import { GameEvent, NotificationMessage } from '../types';

export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect(): void {
    const wsUrl = process.env['REACT_APP_WS_URL'] || 'http://localhost:3003';
    
    this.socket = io(wsUrl, {
      path: '/ws/gamification',
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Authenticate with the server
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');
      
      if (userId && token) {
        this.socket?.emit('authenticate', { userId, token });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      
      // Subscribe to relevant events
      this.socket?.emit('subscribe', [
        'badge_earned',
        'achievement_unlocked',
        'level_up',
        'points_awarded',
        'streak_updated',
        'rank_changed',
        'notification'
      ]);
    });

    this.socket.on('subscribed', (data) => {
      console.log('Subscribed to events:', data.events);
    });

    this.socket.on('game_event', (data: { event: GameEvent }) => {
      this.handleGameEvent(data.event);
    });

    this.socket.on('notification', (data: { notification: NotificationMessage }) => {
      this.handleNotification(data.notification);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleGameEvent(event: GameEvent): void {
    console.log('Game event received:', event);
    
    // Emit to registered handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));
    
    // Also emit to generic 'game_event' handlers
    const genericHandlers = this.eventHandlers.get('game_event') || [];
    genericHandlers.forEach(handler => handler(event));
  }

  private handleNotification(notification: NotificationMessage): void {
    console.log('Notification received:', notification);
    
    // Emit to notification handlers
    const handlers = this.eventHandlers.get('notification') || [];
    handlers.forEach(handler => handler(notification));
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  }

  // Public methods
  public on(event: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;