/**
 * Competition-specific user profile extensions
 */

export interface CompetitionProfile {
  userId: string;
  externalPlatforms: ExternalPlatformConnection[];
  competitionPreferences: CompetitionPreferences;
  competitionStats: CompetitionStatistics;
  competitionAchievements: CompetitionAchievement[];
  competitionBadges: CompetitionBadge[];
  competitionHistory: CompetitionParticipation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExternalPlatformConnection {
  platform: ExternalPlatform;
  username: string;
  profileUrl: string;
  accessToken?: string; // Encrypted
  refreshToken?: string; // Encrypted
  isVerified: boolean;
  lastSync: Date;
  syncEnabled: boolean;
  permissions: PlatformPermission[];
  metadata: Record<string, any>;
}

export interface CompetitionPreferences {
  autoJoinRecommended: boolean;
  difficultyPreference: DifficultyLevel[];
  competitionTypes: CompetitionType[];
  notificationSettings: CompetitionNotificationSettings;
  privacySettings: CompetitionPrivacySettings;
  teamPreferences: TeamPreferences;
}

export interface CompetitionNotificationSettings {
  newCompetitions: boolean;
  competitionStart: boolean;
  competitionEnd: boolean;
  milestoneAchieved: boolean;
  badgeEarned: boolean;
  leaderboardUpdate: boolean;
  teamInvitations: boolean;
  reminderNotifications: boolean;
  weeklyDigest: boolean;
}

export interface CompetitionPrivacySettings {
  showCompetitionHistory: boolean;
  showExternalProfiles: boolean;
  allowTeamInvites: boolean;
  shareProgressWithTeam: boolean;
  publicLeaderboard: boolean;
  showRealTimeProgress: boolean;
}

export interface TeamPreferences {
  preferredTeamSize: number;
  skillLevelPreference: SkillLevel;
  communicationStyle: CommunicationStyle;
  availableTimeZones: string[];
  collaborationTools: string[];
  mentorshipInterest: MentorshipLevel;
}

export interface CompetitionStatistics {
  totalCompetitions: number;
  activeCompetitions: number;
  completedCompetitions: number;
  totalPoints: number;
  averageRank: number;
  bestRank: number;
  totalBadges: number;
  totalAchievements: number;
  winRate: number;
  participationStreak: StreakInfo;
  competitionsByType: Record<CompetitionType, CompetitionTypeStats>;
  monthlyStats: MonthlyCompetitionStats[];
}

export interface CompetitionTypeStats {
  participated: number;
  completed: number;
  totalPoints: number;
  averageRank: number;
  bestRank: number;
  badges: number;
  achievements: number;
}

export interface MonthlyCompetitionStats {
  month: string; // YYYY-MM format
  competitions: number;
  points: number;
  badges: number;
  achievements: number;
  averageRank: number;
}

export interface CompetitionAchievement {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionType: CompetitionType;
  achievementType: AchievementType;
  name: string;
  description: string;
  points: number;
  rarity: AchievementRarity;
  isVerified: boolean;
  verificationSource: string;
  earnedAt: Date;
  externalUrl?: string;
  metadata: Record<string, any>;
}

export interface CompetitionBadge {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionType: CompetitionType;
  badgeType: BadgeType;
  name: string;
  description: string;
  imageUrl: string;
  rarity: BadgeRarity;
  isVerified: boolean;
  verificationSource: string;
  earnedAt: Date;
  externalUrl?: string;
  showcasePosition?: number;
  metadata: Record<string, any>;
}

export interface CompetitionParticipation {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionType: CompetitionType;
  status: ParticipationStatus;
  joinedAt: Date;
  completedAt?: Date;
  finalRank?: number;
  totalParticipants?: number;
  pointsEarned: number;
  badgesEarned: number;
  achievementsEarned: number;
  teamId?: string;
  teamName?: string;
  progress: CompetitionProgress;
  externalData: Record<string, any>;
}

export interface CompetitionProgress {
  completedTasks: number;
  totalTasks: number;
  completionPercentage: number;
  currentStreak: number;
  milestones: CompetitionMilestone[];
  submissions: CompetitionSubmission[];
  lastActivity: Date;
}

export interface CompetitionMilestone {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  completedAt?: Date;
  points: number;
}

export interface CompetitionSubmission {
  id: string;
  type: SubmissionType;
  title: string;
  url: string;
  status: SubmissionStatus;
  score?: number;
  submittedAt: Date;
  reviewedAt?: Date;
  feedback?: string;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActivity: Date;
  multiplier: number;
}

// Enums
export enum ExternalPlatform {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  STACKOVERFLOW = 'stackoverflow',
  LEETCODE = 'leetcode',
  CODEWARS = 'codewars',
  HACKERRANK = 'hackerrank',
  KAGGLE = 'kaggle'
}

export enum PlatformPermission {
  READ_PROFILE = 'read_profile',
  READ_REPOSITORIES = 'read_repositories',
  READ_CONTRIBUTIONS = 'read_contributions',
  READ_ACHIEVEMENTS = 'read_achievements',
  WRITE_REPOSITORIES = 'write_repositories',
  MANAGE_WEBHOOKS = 'manage_webhooks'
}

export enum CompetitionType {
  HACKTOBERFEST = 'hacktoberfest',
  GITHUB_GAME_OFF = 'github_game_off',
  GITLAB_HACKATHON = 'gitlab_hackathon',
  OPEN_SOURCE_CHALLENGE = 'open_source_challenge',
  CODING_COMPETITION = 'coding_competition',
  HACKATHON = 'hackathon',
  CUSTOM = 'custom'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum SkillLevel {
  NOVICE = 'novice',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master'
}

export enum CommunicationStyle {
  CASUAL = 'casual',
  PROFESSIONAL = 'professional',
  TECHNICAL = 'technical',
  COLLABORATIVE = 'collaborative',
  MENTORING = 'mentoring'
}

export enum MentorshipLevel {
  NONE = 'none',
  SEEKING_MENTOR = 'seeking_mentor',
  WILLING_TO_MENTOR = 'willing_to_mentor',
  EXPERIENCED_MENTOR = 'experienced_mentor'
}

export enum AchievementType {
  PARTICIPATION = 'participation',
  MILESTONE = 'milestone',
  COMPLETION = 'completion',
  EXCELLENCE = 'excellence',
  COLLABORATION = 'collaboration',
  INNOVATION = 'innovation',
  LEADERSHIP = 'leadership'
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum BadgeType {
  PARTICIPATION = 'participation',
  ACHIEVEMENT = 'achievement',
  MILESTONE = 'milestone',
  SPECIAL = 'special',
  SEASONAL = 'seasonal',
  EXCLUSIVE = 'exclusive'
}

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum ParticipationStatus {
  REGISTERED = 'registered',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  WITHDRAWN = 'withdrawn',
  DISQUALIFIED = 'disqualified'
}

export enum SubmissionType {
  PULL_REQUEST = 'pull_request',
  REPOSITORY = 'repository',
  PROJECT = 'project',
  DOCUMENTATION = 'documentation',
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  CODE_REVIEW = 'code_review'
}

export enum SubmissionStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_CHANGES = 'needs_changes'
}

export default CompetitionProfile;