/**
 * Enhanced User model for GamifyX platform
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  avatarUrl?: string;
  bio?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  location?: string;
  timezone: string;
  preferences: UserPreferences;
  gamification: GamificationProfile;
  socialLinks: SocialLinks;
  skills: string[];
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: CyberpunkTheme;
  language: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
}

export interface GamificationProfile {
  totalXP: number;
  currentLevel: number;
  levelProgress: number;
  rank: number;
  totalPoints: number;
  badges: Badge[];
  achievements: Achievement[];
  streaks: UserStreaks;
  statistics: UserStatistics;
  customization: ProfileCustomization;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  achievements: boolean;
  badges: boolean;
  leaderboard: boolean;
  teamUpdates: boolean;
  systemAlerts: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

export interface DashboardPreferences {
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  autoRefresh: boolean;
  refreshInterval: number;
  animations: boolean;
  particles: boolean;
  soundEffects: boolean;
  compactMode: boolean;
  showTutorials: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: ProfileVisibility;
  showRealName: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showGithub: boolean;
  allowTeamInvites: boolean;
  allowDirectMessages: boolean;
  shareAnalytics: boolean;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  colorBlindSupport: boolean;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  discord?: string;
  website?: string;
  blog?: string;
}

export interface UserStreaks {
  dailyLogin: StreakInfo;
  submission: StreakInfo;
  achievement: StreakInfo;
  teamParticipation: StreakInfo;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActivity: Date;
  multiplier: number;
}

export interface UserStatistics {
  totalSubmissions: number;
  successfulSubmissions: number;
  averageScore: number;
  totalFeedbackReceived: number;
  helpfulFeedbackGiven: number;
  teamCollaborations: number;
  mentoringSessions: number;
  challengesCompleted: number;
  incidentsResolved: number;
  uptime: number;
}

export interface ProfileCustomization {
  cyberpunkAvatar: CyberpunkAvatar;
  bannerImage?: string;
  accentColor: string;
  profileBadges: string[];
  showcaseAchievements: string[];
  statusMessage?: string;
  profileEffects: ProfileEffect[];
}

export interface CyberpunkAvatar {
  baseModel: AvatarModel;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  facialHair?: string;
  accessories: AvatarAccessory[];
  clothing: AvatarClothing;
  cybernetics: CyberneticEnhancement[];
}

export interface AvatarAccessory {
  type: AccessoryType;
  model: string;
  color: string;
  glowEffect?: boolean;
}

export interface AvatarClothing {
  top: ClothingItem;
  bottom: ClothingItem;
  shoes: ClothingItem;
  jacket?: ClothingItem;
  gloves?: ClothingItem;
}

export interface ClothingItem {
  model: string;
  color: string;
  pattern?: string;
  material: ClothingMaterial;
  rarity: ItemRarity;
}

export interface CyberneticEnhancement {
  type: CyberneticType;
  model: string;
  glowColor: string;
  animationEffect?: string;
  unlockRequirement: string;
}

export interface ProfileEffect {
  type: EffectType;
  name: string;
  duration?: number;
  intensity: number;
  color?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  earnedAt: Date;
  progress?: number;
  maxProgress?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  requirements: AchievementRequirement[];
}

export interface AchievementRequirement {
  type: RequirementType;
  target: number;
  current: number;
  description: string;
}

// Enums and Types
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
  MENTOR = 'mentor',
  GUEST = 'guest'
}

export enum CyberpunkTheme {
  NEON_BLUE = 'neon_blue',
  ELECTRIC_PINK = 'electric_pink',
  CYBER_GREEN = 'cyber_green',
  PLASMA_PURPLE = 'plasma_purple',
  HOLOGRAM_GOLD = 'hologram_gold',
  MATRIX_RED = 'matrix_red',
  CUSTOM = 'custom'
}

export enum DashboardLayout {
  DEFAULT = 'default',
  COMPACT = 'compact',
  EXPANDED = 'expanded',
  MINIMAL = 'minimal',
  CUSTOM = 'custom'
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  TEAM_ONLY = 'team_only',
  FRIENDS_ONLY = 'friends_only',
  PRIVATE = 'private'
}

export enum AvatarModel {
  HUMAN_MALE = 'human_male',
  HUMAN_FEMALE = 'human_female',
  ANDROID_MALE = 'android_male',
  ANDROID_FEMALE = 'android_female',
  CYBORG_MALE = 'cyborg_male',
  CYBORG_FEMALE = 'cyborg_female',
  AI_CONSTRUCT = 'ai_construct'
}

export enum AccessoryType {
  GLASSES = 'glasses',
  HEADSET = 'headset',
  EARPIECE = 'earpiece',
  MASK = 'mask',
  VISOR = 'visor',
  IMPLANT = 'implant'
}

export enum ClothingMaterial {
  FABRIC = 'fabric',
  LEATHER = 'leather',
  SYNTHETIC = 'synthetic',
  METAL = 'metal',
  HOLOGRAPHIC = 'holographic',
  ENERGY = 'energy'
}

export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic'
}

export enum CyberneticType {
  ARM_ENHANCEMENT = 'arm_enhancement',
  EYE_IMPLANT = 'eye_implant',
  NEURAL_INTERFACE = 'neural_interface',
  SPINE_AUGMENTATION = 'spine_augmentation',
  LEG_ENHANCEMENT = 'leg_enhancement',
  BRAIN_CHIP = 'brain_chip'
}

export enum EffectType {
  GLOW = 'glow',
  PARTICLE = 'particle',
  HOLOGRAM = 'hologram',
  ENERGY_FIELD = 'energy_field',
  DATA_STREAM = 'data_stream',
  MATRIX_RAIN = 'matrix_rain'
}

export enum BadgeRarity {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

export enum BadgeCategory {
  PERFORMANCE = 'performance',
  COLLABORATION = 'collaboration',
  INNOVATION = 'innovation',
  SECURITY = 'security',
  MENTORSHIP = 'mentorship',
  SPECIAL = 'special'
}

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum AchievementCategory {
  CODING = 'coding',
  DEVOPS = 'devops',
  SECURITY = 'security',
  COLLABORATION = 'collaboration',
  LEARNING = 'learning',
  MENTORSHIP = 'mentorship',
  INNOVATION = 'innovation',
  SPECIAL_EVENT = 'special_event'
}

export enum RequirementType {
  SUBMISSIONS_COUNT = 'submissions_count',
  SCORE_AVERAGE = 'score_average',
  STREAK_DAYS = 'streak_days',
  TEAM_COLLABORATIONS = 'team_collaborations',
  MENTORING_HOURS = 'mentoring_hours',
  INCIDENTS_RESOLVED = 'incidents_resolved',
  UPTIME_PERCENTAGE = 'uptime_percentage'
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  visible: boolean;
}

export enum WidgetType {
  SYSTEM_HEALTH = 'system_health',
  LEADERBOARD = 'leaderboard',
  ACHIEVEMENTS = 'achievements',
  METRICS = 'metrics',
  TEAM_ACTIVITY = 'team_activity',
  AI_INSIGHTS = 'ai_insights',
  RECENT_SUBMISSIONS = 'recent_submissions',
  PERFORMANCE_CHART = 'performance_chart'
}

export interface WidgetPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

export interface WidgetConfig {
  title?: string;
  refreshInterval?: number;
  showHeader?: boolean;
  theme?: string;
  customSettings?: Record<string, any>;
}

export default User;