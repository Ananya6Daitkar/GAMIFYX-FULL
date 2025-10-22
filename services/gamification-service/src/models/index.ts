/**
 * Data models for gamification service
 */

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
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
    lastActivityDate: Date;
    milestones: StreakMilestone[];
  };
  leaderboardRank: number;
  // Enhanced cyberpunk features
  cyberpunkTheme: CyberpunkTheme;
  visualPreferences: VisualPreferences;
  teamAffiliation?: TeamAffiliation;
  prestigeLevel: number; // For users who reach max level
  seasonalStats: SeasonalStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  criteria: BadgeCriteria;
  rarity: BadgeRarity;
  points: number;
  isActive: boolean;
  // Enhanced cyberpunk features
  theme: BadgeTheme;
  visualEffects: VisualEffects;
  showcaseFeatures: ShowcaseFeatures;
  rarityLevel: number; // 1-5 scale for fine-grained rarity
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress?: number; // For progressive badges
  metadata?: Record<string, any>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  points: number;
  isRepeatable: boolean;
  cooldownHours?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  earnedAt: Date;
  count: number; // For repeatable achievements
  metadata?: Record<string, any>;
}

export interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  reason: PointReason;
  source: string; // submission_id, achievement_id, etc.
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
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

export interface Milestone {
  id: string;
  name: string;
  description: string;
  type: MilestoneType;
  threshold: number;
  points: number;
  badgeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export enum PointReason {
  SUBMISSION = 'submission',
  CODE_QUALITY = 'code_quality',
  SECURITY_SCORE = 'security_score',
  TEST_COVERAGE = 'test_coverage',
  FEEDBACK_IMPLEMENTATION = 'feedback_implementation',
  STREAK_BONUS = 'streak_bonus',
  ACHIEVEMENT = 'achievement',
  BADGE = 'badge',
  MILESTONE = 'milestone',
  PEER_REVIEW = 'peer_review',
  HELP_OTHERS = 'help_others'
}

export enum MilestoneType {
  POINTS = 'points',
  SUBMISSIONS = 'submissions',
  BADGES = 'badges',
  STREAK = 'streak',
  LEVEL = 'level'
}

// Criteria interfaces
export interface BadgeCriteria {
  type: 'submission_count' | 'code_quality' | 'security_score' | 'streak' | 'points' | 'custom';
  threshold?: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  conditions?: Record<string, any>;
}

export interface AchievementCriteria {
  type: 'single_submission' | 'multiple_submissions' | 'improvement' | 'consistency' | 'custom';
  threshold?: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  conditions?: Record<string, any>;
}

// API Request/Response types
export interface AwardPointsRequest {
  userId: string;
  points: number;
  reason: PointReason;
  source: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface CheckAchievementsRequest {
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
}

export interface LeaderboardQuery {
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number;
  offset?: number;
  category?: string;
}

export interface UserStatsResponse {
  profile: UserGameProfile;
  badges: UserBadge[];
  achievements: UserAchievement[];
  recentTransactions: PointTransaction[];
  nextMilestones: Milestone[];
  leaderboardPosition: number;
}

// Enhanced cyberpunk interfaces
export interface BadgeTheme {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  backgroundPattern: string;
  cyberpunkStyle: 'neon' | 'matrix' | 'hologram' | 'circuit' | 'glitch';
}

export interface VisualEffects {
  glowIntensity: number; // 0-100
  animationType: 'pulse' | 'rotate' | 'glitch' | 'matrix' | 'hologram';
  particleEffects: boolean;
  soundEffect?: string;
  celebrationDuration: number; // milliseconds
}

export interface ShowcaseFeatures {
  isShowcased: boolean;
  showcasePosition: number;
  customMessage?: string;
  unlockDate: Date;
  shareableLink?: string;
}

export interface CyberpunkTheme {
  selectedTheme: 'neon-blue' | 'matrix-green' | 'cyber-red' | 'hologram-purple' | 'glitch-orange';
  customColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  effectsEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

export interface VisualPreferences {
  showAnimations: boolean;
  showParticleEffects: boolean;
  soundEnabled: boolean;
  celebrationStyle: 'minimal' | 'standard' | 'epic';
  dashboardLayout: 'compact' | 'standard' | 'expanded';
}

export interface TeamAffiliation {
  teamId: string;
  teamName: string;
  role: 'member' | 'leader' | 'captain';
  joinedAt: Date;
  teamPoints: number;
  teamRank: number;
}

export interface StreakMilestone {
  days: number;
  achievedAt: Date;
  bonusPoints: number;
  specialReward?: string;
}

export interface SeasonalStats {
  currentSeason: string;
  seasonStartDate: Date;
  seasonPoints: number;
  seasonRank: number;
  seasonBadges: number;
  previousSeasons: PreviousSeasonStats[];
}

export interface PreviousSeasonStats {
  season: string;
  finalPoints: number;
  finalRank: number;
  badgesEarned: number;
  achievements: number;
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
  // Enhanced features
  prestigeLevel: number;
  teamAffiliation?: TeamAffiliation;
  cyberpunkTheme: CyberpunkTheme;
  recentActivity: RecentActivity[];
  trendDirection: 'up' | 'down' | 'stable';
  rankChange: number; // Change from previous period
}

export interface RecentActivity {
  type: 'badge' | 'achievement' | 'level_up' | 'streak';
  name: string;
  timestamp: Date;
  points: number;
}

export interface TeamLeaderboard {
  teamId: string;
  teamName: string;
  totalPoints: number;
  memberCount: number;
  averageLevel: number;
  rank: number;
  badges: number;
  achievements: number;
  recentActivity: TeamActivity[];
}

export interface TeamActivity {
  userId: string;
  username: string;
  activity: string;
  points: number;
  timestamp: Date;
}

// Enhanced WebSocket message types
export interface GameEvent {
  type: 'badge_earned' | 'achievement_unlocked' | 'level_up' | 'points_awarded' | 'streak_updated' | 'rank_changed' | 'team_milestone' | 'prestige_unlock' | 'seasonal_reward';
  userId: string;
  data: any;
  timestamp: Date;
  // Enhanced features
  visualEffects?: VisualEffects;
  celebrationLevel: 'minimal' | 'standard' | 'epic';
  teamNotification?: boolean;
}

export interface NotificationMessage {
  id: string;
  userId: string;
  type: 'badge' | 'achievement' | 'level_up' | 'milestone' | 'rank_change';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}