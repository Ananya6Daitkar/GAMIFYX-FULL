export interface NotificationTemplate {
  name: string;
  subject: string;
  body: string;
  variables?: string[];
}

export type NotificationChannel = 'email' | 'websocket' | 'slack' | 'push';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationData {
  id: string;
  recipients: string[];
  template: NotificationTemplate;
  data: any;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  deliveryAttempts?: number;
  lastAttempt?: Date;
  errorMessage?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  websocketEnabled: boolean;
  slackEnabled: boolean;
  pushEnabled: boolean;
  quietHours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
  categories: {
    competitions: boolean;
    campaigns: boolean;
    achievements: boolean;
    deadlines: boolean;
    progress: boolean;
    motivational: boolean;
  };
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  trigger: NotificationTrigger;
  template: NotificationTemplate;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  conditions?: NotificationCondition[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTrigger {
  event: string;
  filters?: { [key: string]: any };
  delay?: number; // milliseconds
  recurring?: {
    interval: number; // milliseconds
    maxOccurrences?: number;
    endDate?: Date;
  };
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  channelStats: {
    [channel in NotificationChannel]: {
      sent: number;
      delivered: number;
      failed: number;
    };
  };
  templateStats: {
    [templateName: string]: {
      sent: number;
      delivered: number;
      failed: number;
    };
  };
}

export interface MotivationalMessage {
  type: 'encouragement' | 'celebration' | 'challenge' | 'tip' | 'reminder';
  content: string;
  conditions: {
    progressRange?: { min: number; max: number };
    streakLength?: number;
    timeOfDay?: string[];
    dayOfWeek?: string[];
    competitionType?: string[];
  };
  frequency: 'once' | 'daily' | 'weekly' | 'on_event';
}

export interface ReminderSchedule {
  campaignId: string;
  participantId: string;
  reminders: {
    type: 'deadline' | 'progress_check' | 'milestone' | 'encouragement';
    scheduledAt: Date;
    sent: boolean;
    sentAt?: Date;
    template: NotificationTemplate;
  }[];
}

export interface NotificationMetrics {
  timestamp: Date;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  metadata?: {
    deliveryTime?: number;
    errorCode?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}