/**
 * Competition-specific type definitions
 */

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: CompetitionType;
  status: CompetitionStatus;
  organizer: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  requirements: CompetitionRequirement[];
  rewards: CompetitionReward[];
  badges: CompetitionBadge[];
  tags: string[];
  categories: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  participantCount: number;
  maxParticipants?: number;
  rules: string[];
  eligibilityCriteria: string[];
  createdAt: string;
  updatedAt: string;
}

export enum CompetitionType {
  HACKTOBERFEST = 'hacktoberfest',
  GITHUB_GAME_OFF = 'github_game_off',
  GITLAB_HACKATHON = 'gitlab_hackathon',
  CUSTOM_COMPETITION = 'custom_competition',
  OPEN_SOURCE_CHALLENGE = 'open_source_challenge'
}

export enum CompetitionStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface CompetitionRequirement {
  id: string;
  type: 'pull_request' | 'commit' | 'repository' | 'issue' | 'review' | 'custom';
  description: string;
  criteria: Record<string, any>;
  points: number;
  required: boolean;
}

export interface CompetitionReward {
  id: string;
  name: string;
  description: string;
  type: 'badge' | 'points' | 'certificate' | 'swag' | 'recognition';
  criteria: string;
  value?: number;
  imageUrl?: string;
  externalUrl?: string;
}

export interface CompetitionBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  criteria: string;
  points: number;
}

export interface Participation {
  id: string;
  competitionId: string;
  userId: string;
  status: ParticipationStatus;
  registeredAt: string;
  githubUsername?: string;
  gitlabUsername?: string;
  progress: ParticipationProgress;
  achievements: CompetitionAchievement[];
  submissions: CompetitionSubmission[];
  totalScore: number;
  rank?: number;
  completedAt?: string;
}

export enum ParticipationStatus {
  REGISTERED = 'registered',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISQUALIFIED = 'disqualified',
  WITHDRAWN = 'withdrawn'
}

export interface ParticipationProgress {
  completedRequirements: string[];
  totalRequirements: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt?: string;
  milestones: Milestone[];
}

export interface CompetitionAchievement {
  id: string;
  competitionId: string;
  requirementId: string;
  name: string;
  description: string;
  points: number;
  earnedAt: string;
  verified: boolean;
}

export interface CompetitionSubmission {
  id: string;
  participationId: string;
  requirementId: string;
  type: 'pull_request' | 'repository' | 'project' | 'documentation' | 'other';
  title: string;
  description: string;
  url: string;
  repositoryUrl?: string;
  status: 'pending' | 'validating' | 'approved' | 'rejected' | 'needs_review';
  score: number;
  maxScore: number;
  submittedAt: string;
  reviewedAt?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  criteria: string;
  points: number;
  achievedAt?: string;
  progress: number; // 0-100
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  instructorId: string;
  classId?: string;
  courseId?: string;
  competitionIds: string[];
  invitedStudents: string[];
  participatingStudents: string[];
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  participationRate: number;
  completionRate: number;
  averageScore: number;
  createdAt: string;
  updatedAt: string;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Dashboard-specific types
export interface CompetitionDashboardData {
  competitions: Competition[];
  userParticipations: Participation[];
  availableCompetitions: Competition[];
  featuredCompetitions: Competition[];
  userStats: CompetitionUserStats;
  recentActivity: CompetitionActivity[];
  leaderboard: CompetitionLeaderboardEntry[];
}

export interface CompetitionUserStats {
  totalParticipations: number;
  activeParticipations: number;
  completedParticipations: number;
  totalPoints: number;
  totalAchievements: number;
  totalBadges: number;
  averageScore: number;
  bestRank: number;
  currentStreak: number;
  longestStreak: number;
}

export interface CompetitionActivity {
  id: string;
  type: 'registration' | 'submission' | 'achievement' | 'milestone' | 'completion';
  competitionId: string;
  competitionName: string;
  description: string;
  points?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CompetitionLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  totalScore: number;
  rank: number;
  participations: number;
  achievements: number;
  badges: number;
  currentStreak: number;
}

// Filter and search types
export interface CompetitionFilters {
  type?: CompetitionType[];
  status?: CompetitionStatus[];
  difficultyLevel?: string[];
  tags?: string[];
  categories?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  participantRange?: {
    min: number;
    max: number;
  };
}

export interface CompetitionSearchParams {
  query?: string;
  filters?: CompetitionFilters;
  sortBy?: 'name' | 'startDate' | 'endDate' | 'participantCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Progress tracking types
export interface ProgressTrackingData {
  competitionId: string;
  participationId: string;
  requirements: RequirementProgress[];
  milestones: MilestoneProgress[];
  timeline: ProgressTimelineEntry[];
  predictions: ProgressPrediction[];
}

export interface RequirementProgress {
  requirementId: string;
  name: string;
  description: string;
  type: string;
  required: boolean;
  completed: boolean;
  progress: number; // 0-100
  score: number;
  maxScore: number;
  submissions: CompetitionSubmission[];
  lastUpdated: string;
}

export interface MilestoneProgress {
  milestoneId: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  progress: number; // 0-100
  achieved: boolean;
  achievedAt?: string;
  points: number;
}

export interface ProgressTimelineEntry {
  id: string;
  timestamp: string;
  type: 'registration' | 'submission' | 'achievement' | 'milestone' | 'validation';
  title: string;
  description: string;
  points?: number;
  metadata?: Record<string, any>;
}

export interface ProgressPrediction {
  type: 'completion' | 'rank' | 'score';
  prediction: number;
  confidence: number; // 0-100
  timeframe: string;
  factors: string[];
}

// Real-time update types
export interface CompetitionUpdate {
  type: 'participation' | 'submission' | 'achievement' | 'leaderboard' | 'competition_status';
  competitionId: string;
  userId?: string;
  data: any;
  timestamp: string;
}

// API response types
export interface CompetitionApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface CompetitionPaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Registration types
export interface CompetitionRegistrationData {
  competitionId: string;
  githubUsername?: string;
  gitlabUsername?: string;
  additionalData?: Record<string, any>;
}

export interface CompetitionRegistrationResponse {
  success: boolean;
  participationId: string;
  message: string;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  score: number;
  maxScore: number;
  reasons: string[];
  metadata: Record<string, any>;
}