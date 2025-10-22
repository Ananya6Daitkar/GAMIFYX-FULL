import { io, Socket } from 'socket.io-client';
import { gamifyxApi } from './gamifyxApi';

export interface WebSocketEvents {
  'system:health:update': (data: { timestamp: string; data: any }) => void;
  'metrics:update': (data: { timestamp: string; data: any }) => void;
  'leaderboard:update': (data: { timestamp: string; data: any }) => void;
  'achievement:unlocked': (data: { timestamp: string; achievement: any }) => void;
  'achievement:global': (data: { timestamp: string; userId: string; achievement: any }) => void;
  'incident:prediction': (data: { timestamp: string; incident: any }) => void;
  'ai:insight': (data: { timestamp: string; insight: any }) => void;
  'notification': (data: { timestamp: string; [key: string]: any }) => void;
  'dashboard:initial': (data: { timestamp: string; data: any }) => void;
  'team:update': (data: { timestamp: string; data: any }) => void;
  'badge:earned': (data: { timestamp: string; badge: any }) => void;
  'badge:global': (data: { timestamp: string; userId: string; badge: any }) => void;
  'level:up': (data: { timestamp: string; level: number; xp: number }) => void;
  'level:celebration': (data: { timestamp: string; userId: string; level: number }) => void;
  'streak:update': (data: { timestamp: string; streak: number; type: string }) => void;
  'challenge:update': (data: { timestamp: string; data: any }) => void;
  'system:alert': (data: { timestamp: string; alert: any }) => void;
  'performance:prediction': (data: { timestamp: string; prediction: any }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (!gamifyxApi.isAuthenticated()) {
      console.log('WebSocket: Not authenticated, skipping connection');
      return;
    }

    const token = localStorage.getItem('gamifyx_token');
    const wsUrl = process.env['REACT_APP_WS_URL'] || 'http://localhost:3000';
    
    this.socket = io(wsUrl, {
      path: '/ws',
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to dashboard updates
      this.socket?.emit('subscribe:dashboard');
      this.socket?.emit('subscribe:leaderboard');
      this.socket?.emit('subscribe:metrics');
      this.socket?.emit('subscribe:achievements');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      // Attempt to reconnect
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.attemptReconnect();
    });

    // Set up event forwarding
    this.socket.on('system:health:update', (data) => {
      this.emit('system:health:update', data);
    });

    this.socket.on('metrics:update', (data) => {
      this.emit('metrics:update', data);
    });

    this.socket.on('leaderboard:update', (data) => {
      this.emit('leaderboard:update', data);
    });

    this.socket.on('achievement:unlocked', (data) => {
      this.emit('achievement:unlocked', data);
      // Show notification
      this.showAchievementNotification(data.achievement);
    });

    this.socket.on('achievement:global', (data) => {
      this.emit('achievement:global', data);
    });

    this.socket.on('incident:prediction', (data) => {
      this.emit('incident:prediction', data);
      // Show notification for high severity incidents
      if (data.incident.severity === 'high' || data.incident.severity === 'critical') {
        this.showIncidentNotification(data.incident);
      }
    });

    this.socket.on('ai:insight', (data) => {
      this.emit('ai:insight', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
      this.showGenericNotification(data);
    });

    this.socket.on('dashboard:initial', (data) => {
      this.emit('dashboard:initial', data);
    });

    // Enhanced GamifyX events
    this.socket.on('team:update', (data) => {
      this.emit('team:update', data);
    });

    this.socket.on('badge:earned', (data) => {
      this.emit('badge:earned', data);
      this.showBadgeNotification(data.badge);
    });

    this.socket.on('badge:global', (data) => {
      this.emit('badge:global', data);
    });

    this.socket.on('level:up', (data) => {
      this.emit('level:up', data);
      this.showLevelUpNotification(data);
    });

    this.socket.on('level:celebration', (data) => {
      this.emit('level:celebration', data);
    });

    this.socket.on('streak:update', (data) => {
      this.emit('streak:update', data);
      if (data.streak > 0 && data.streak % 5 === 0) {
        this.showStreakNotification(data);
      }
    });

    this.socket.on('challenge:update', (data) => {
      this.emit('challenge:update', data);
    });

    this.socket.on('system:alert', (data) => {
      this.emit('system:alert', data);
      if (data.alert.severity === 'critical') {
        this.showSystemAlertNotification(data.alert);
      }
    });

    this.socket.on('performance:prediction', (data) => {
      this.emit('performance:prediction', data);
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  private showAchievementNotification(achievement: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎉 Achievement Unlocked!', {
        body: `You've unlocked: ${achievement.title}`,
        icon: '/favicon.ico',
        tag: 'achievement'
      });
    }
  }

  private showIncidentNotification(incident: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ Incident Predicted', {
        body: `${incident.title} (${incident.confidence}% confidence)`,
        icon: '/favicon.ico',
        tag: 'incident'
      });
    }
  }

  private showGenericNotification(notification: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'GamifyX Notification', {
        body: notification.message || notification.body,
        icon: '/favicon.ico',
        tag: 'generic'
      });
    }
  }

  private showBadgeNotification(badge: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🏆 Badge Earned!', {
        body: `You've earned the "${badge.name}" badge!`,
        icon: '/favicon.ico',
        tag: 'badge'
      });
    }
  }

  private showLevelUpNotification(data: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚀 Level Up!', {
        body: `Congratulations! You've reached level ${data.level}!`,
        icon: '/favicon.ico',
        tag: 'levelup'
      });
    }
  }

  private showStreakNotification(data: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔥 Streak Milestone!', {
        body: `Amazing! You've reached a ${data.streak}-day streak!`,
        icon: '/favicon.ico',
        tag: 'streak'
      });
    }
  }

  private showSystemAlertNotification(alert: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Critical System Alert', {
        body: alert.message || 'Critical system issue detected',
        icon: '/favicon.ico',
        tag: 'critical-alert',
        requireInteraction: true
      });
    }
  }

  // Public methods
  public on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  public off<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
export default websocketService;