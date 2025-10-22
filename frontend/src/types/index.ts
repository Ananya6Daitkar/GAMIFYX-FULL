/**
 * Type definitions for the AIOps Learning Platform
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
}

export interface UserGameProfile {
  userId: string;
  totalPoints: number;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  streaks: {
    current: number;
    longest: number;
    lastActivityDate: string;
  };
  leaderboardRank: number;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  points: number;
  earnedAt?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  points: number;
  earnedAt?: string;
  count?: number;
}

export interface Submission {
  id: string;
  userId: string;
  title: string;
  description: string;
  codeQualityScore: number;
  completionTime: number;
  testCoverage: number;
  securityScore: number;
  overallScore: number;
  feedback: FeedbackItem[];
  submittedAt: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface FeedbackItem {
  id: string;
  type: 'code_quality' | 'security' | 'performance' | 'best_practices' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  lineNumber?: number;
  suggestion?: string;
  resourceLinks: string[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  level: number;
  rank: number;
  badges: number;
  achievements: number;
  streak: number;
}

export interface PerformanceMetric {
  timestamp: string;
  codeQuality: number;
  completionTime: number;
  testCoverage: number;
  securityScore: number;
}

export interface ProgressData {
  date: string;
  points: number;
  level: number;
  submissions: number;
}

export interface NotificationMessage {
  id: string;
  type: 'badge' | 'achievement' | 'level_up' | 'milestone' | 'feedback';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface RiskScore {
  userId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors?: RiskFactor[];
  recommendations?: string[];
  calculatedAt: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// Enums
export enum BadgeCategory {
  CODING = 'coding',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  COLLABORATION = 'collaboration',
  LEARNING = 'learning',
  MILESTONE = 'milestone',
  SPECIAL = 'special'
}

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum AchievementCategory {
  SUBMISSION = 'submission',
  QUALITY = 'quality',
  CONSISTENCY = 'consistency',
  IMPROVEMENT = 'improvement',
  SOCIAL = 'social',
  MILESTONE = 'milestone'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// WebSocket event types
export interface GameEvent {
  type: 'badge_earned' | 'achievement_unlocked' | 'level_up' | 'points_awarded' | 'streak_updated' | 'rank_changed';
  userId: string;
  data: any;
  timestamp: string;
}

// Dashboard state types
export interface DashboardState {
  user: User | null;
  profile: UserGameProfile | null;
  badges: Badge[];
  achievements: Achievement[];
  recentSubmissions: Submission[];
  leaderboard: LeaderboardEntry[];
  notifications: NotificationMessage[];
  performanceData: PerformanceMetric[];
  progressData: ProgressData[];
  riskScore: RiskScore | null;
  loading: boolean;
  error: string | null;
}