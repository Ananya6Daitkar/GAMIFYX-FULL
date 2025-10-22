/**
 * Notification types and interfaces for competition service
 */

export enum NotificationType {
  // Competition lifecycle notifications
  COMPETITION_CREATED = 'competition_created',
  COMPETITION_STARTED = 'competition_started',
  COMPETITION_ENDING_SOON = 'competition_ending_soon',
  COMPETITION_ENDED = 'competition_ended',
  
  // Registration notifications
  REGISTRATION_OPENED = 'registration_opened',
  REGISTRATION_REMINDER = 'registration_reminder',
  REGISTRATION_DEADLINE_APPROACHING = 'registration_deadline_approaching',
  REGISTRATION_CONFIRMED = 'registration_confirmed',
  
  // Progress notifications
  MILESTONE_ACHIEVED = 'milestone_achieved',
  PROGRESS_UPDATE = 'progress_update',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  BADGE_EARNED = 'badge_earned',
  
  // Campaign notifications
  CAMPAIGN_INVITATION = 'campaign_invitation',
  CAMPAIGN_STARTED = 'campaign_started',
  CAMPAIGN_REMINDER = 'campaign_reminder',
  CAMPAIGN_COMPLETED = 'campaign_completed',
  
  // Validation notifications
  SUBMISSION_VALIDATED = 'submission_validated',
  VALIDATION_FAILED = 'validation_failed',
  MANUAL_REVIEW_REQUIRED = 'manual_review_required',
  
  // Motivational notifications
  ENCOURAGEMENT_MESSAGE = 'encouragement_message',
  STREAK_REMINDER = 'streak_reminder',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  PEER_ACHIEVEMENT = 'peer_achievement'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  WEBSOCKET = 'websocket',
  IN_APP = 'in_app',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  subject: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  variables: string[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: string;
  tags: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'instructor' | 'admin' | 'group';
  email?: string;
  slackUserId?: string;
  discordUserId?: string;
  phoneNumber?: string;
  pushTokens?: string[];
  preferences: NotificationPreferences;
  timezone: string;
  language: string;
}

export interface NotificationPreferences {
  channels: {
    [key in NotificationChannel]: boolean;
  };
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  frequency: {
    digest: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
    reminders: boolean;
    marketing: boolean;
  };
}

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  templateId: string;
  recipientId: string;
  recipientType: 'user' | 'instructor' | 'admin' | 'group';
  
  // Message content
  subject: string;
  body: string;
  htmlBody?: string;
  
  // Delivery settings
  channels: NotificationChannel[];
  priority: NotificationPriority;
  scheduledAt?: Date;
  expiresAt?: Date;
  
  // Context data
  competitionId?: string;
  campaignId?: string;
  participationId?: string;
  achievementId?: string;
  
  // Template variables
  variables: Record<string, any>;
  
  // Delivery tracking
  status: NotificationStatus;
  deliveryAttempts: NotificationDeliveryAttempt[];
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface NotificationDeliveryAttempt {
  id: string;
  channel: NotificationChannel;
  attemptedAt: Date;
  status: 'success' | 'failed' | 'retry';
  error?: string;
  response?: any;
  deliveredAt?: Date;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  
  // Trigger conditions
  trigger: {
    event: string;
    conditions: Record<string, any>;
    delay?: number; // seconds
  };
  
  // Template and recipients
  templateId: string;
  recipientQuery: {
    type: 'user' | 'instructor' | 'admin' | 'group' | 'query';
    criteria: Record<string, any>;
  };
  
  // Delivery settings
  channels: NotificationChannel[];
  priority: NotificationPriority;
  
  // Rate limiting
  rateLimit?: {
    maxPerHour?: number;
    maxPerDay?: number;
    cooldownMinutes?: number;
  };
  
  // Scheduling
  schedule?: {
    timezone: string;
    allowedHours?: { start: string; end: string };
    allowedDays?: number[]; // 0-6, Sunday = 0
    blackoutDates?: Date[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ReminderSchedule {
  id: string;
  name: string;
  type: 'competition' | 'campaign' | 'deadline' | 'custom';
  
  // Target information
  targetId: string; // competition/campaign ID
  targetType: string;
  
  // Reminder configuration
  reminders: ReminderConfig[];
  
  // Recipients
  recipients: string[]; // user IDs
  recipientQuery?: {
    type: 'all' | 'participants' | 'non_participants' | 'query';
    criteria?: Record<string, any>;
  };
  
  // Status
  active: boolean;
  completedReminders: string[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ReminderConfig {
  id: string;
  name: string;
  templateId: string;
  
  // Timing
  triggerBefore: number; // seconds before target date
  triggerAt?: Date; // specific date/time
  
  // Conditions
  conditions?: {
    onlyIfNotParticipating?: boolean;
    onlyIfNoProgress?: boolean;
    minProgressThreshold?: number;
    customConditions?: Record<string, any>;
  };
  
  // Delivery
  channels: NotificationChannel[];
  priority: NotificationPriority;
  
  // Repeat settings
  repeat?: {
    enabled: boolean;
    interval: number; // seconds
    maxRepeats: number;
    stopConditions?: Record<string, any>;
  };
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  
  byPriority: Record<NotificationPriority, {
    sent: number;
    delivered: number;
    failed: number;
    avgDeliveryTime: number;
  }>;
  
  timeline: Array<{
    date: Date;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

// Event types for notification triggers
export interface NotificationEvent {
  type: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
  userId?: string;
  competitionId?: string;
  campaignId?: string;
  participationId?: string;
}

// Webhook payload for external integrations
export interface NotificationWebhook {
  id: string;
  url: string;
  secret: string;
  events: NotificationType[];
  active: boolean;
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
}

// Digest notification settings
export interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:mm format
  timezone: string;
  includedTypes: NotificationType[];
  template: {
    subject: string;
    headerTemplate: string;
    itemTemplate: string;
    footerTemplate: string;
  };
}