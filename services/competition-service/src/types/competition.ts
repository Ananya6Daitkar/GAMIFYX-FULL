/**
 * Core types for external competition integration
 * Supports Hacktoberfest, GitHub competitions, GitLab events, and custom competitions
 */

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

export enum ParticipationStatus {
  REGISTERED = 'registered',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISQUALIFIED = 'disqualified',
  WITHDRAWN = 'withdrawn'
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: CompetitionType;
  status: CompetitionStatus;
  
  // Competition details
  organizer: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  
  // Timing
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  
  // Requirements and rules
  requirements: CompetitionRequirement[];
  rules: string[];
  eligibilityCriteria: string[];
  
  // Rewards and recognition
  rewards: CompetitionReward[];
  badges: CompetitionBadge[];
  
  // External integration
  externalId?: string;
  apiEndpoint?: string;
  webhookUrl?: string;
  
  // Validation settings
  validationRules: ValidationRule[];
  autoValidation: boolean;
  
  // Metadata
  tags: string[];
  categories: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  // Tracking
  participantCount: number;
  maxParticipants?: number;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CompetitionRequirement {
  id: string;
  type: 'pull_request' | 'commit' | 'repository' | 'issue' | 'review' | 'custom';
  description: string;
  criteria: Record<string, any>;
  points: number;
  required: boolean;
  validationScript?: string;
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

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'github_pr' | 'gitlab_mr' | 'commit_count' | 'repository_stars' | 'custom';
  script: string;
  parameters: Record<string, any>;
  weight: number;
}

export interface Participation {
  id: string;
  competitionId: string;
  userId: string;
  status: ParticipationStatus;
  
  // Registration details
  registeredAt: Date;
  registrationData: Record<string, any>;
  
  // External platform connections
  githubUsername?: string;
  gitlabUsername?: string;
  externalProfiles: ExternalProfile[];
  
  // Progress tracking
  progress: ParticipationProgress;
  achievements: Achievement[];
  submissions: Submission[];
  
  // Validation and scoring
  validationResults: ValidationResult[];
  totalScore: number;
  rank?: number;
  
  // Metadata
  notes?: string;
  tags: string[];
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ExternalProfile {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'custom';
  username: string;
  profileUrl: string;
  verified: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
}

export interface ParticipationProgress {
  completedRequirements: string[];
  totalRequirements: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt?: Date;
  milestones: Milestone[];
}

export interface Achievement {
  id: string;
  competitionId: string;
  requirementId: string;
  name: string;
  description: string;
  points: number;
  earnedAt: Date;
  evidence: Evidence[];
  verified: boolean;
}

export interface Evidence {
  type: 'pull_request' | 'commit' | 'issue' | 'review' | 'repository' | 'screenshot' | 'link';
  url: string;
  title?: string;
  description?: string;
  metadata: Record<string, any>;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface Submission {
  id: string;
  participationId: string;
  requirementId: string;
  type: 'pull_request' | 'repository' | 'project' | 'documentation' | 'other';
  
  // Submission details
  title: string;
  description: string;
  url: string;
  repositoryUrl?: string;
  
  // External references
  externalId?: string;
  pullRequestNumber?: number;
  commitSha?: string;
  
  // Validation
  status: 'pending' | 'validating' | 'approved' | 'rejected' | 'needs_review';
  validationResults: ValidationResult[];
  reviewComments: ReviewComment[];
  
  // Scoring
  score: number;
  maxScore: number;
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
  
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ValidationResult {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  score: number;
  maxScore: number;
  message: string;
  details: Record<string, any>;
  validatedAt: Date;
  validatedBy: 'system' | 'manual' | string;
}

export interface ReviewComment {
  id: string;
  reviewerId: string;
  comment: string;
  type: 'approval' | 'request_changes' | 'comment';
  createdAt: Date;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  criteria: string;
  points: number;
  achievedAt?: Date;
  progress: number; // 0-100
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  
  // Campaign details
  instructorId: string;
  classId?: string;
  courseId?: string;
  
  // Associated competitions
  competitionIds: string[];
  
  // Participation management
  invitedStudents: string[];
  participatingStudents: string[];
  maxParticipants?: number;
  
  // Timing
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  
  // Campaign-specific settings
  customRequirements: CompetitionRequirement[];
  bonusPoints: number;
  customBadges: CompetitionBadge[];
  
  // Tracking and analytics
  participationRate: number;
  completionRate: number;
  averageScore: number;
  
  // Notifications and communication
  notificationSettings: NotificationSettings;
  announcementChannels: string[];
  
  // Metadata
  tags: string[];
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface NotificationSettings {
  enableEmailNotifications: boolean;
  enableSlackNotifications: boolean;
  enableInAppNotifications: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'milestone' | 'never';
  notificationTypes: NotificationType[];
}

export enum NotificationType {
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_REMINDER = 'registration_reminder',
  COMPETITION_START = 'competition_start',
  MILESTONE_ACHIEVED = 'milestone_achieved',
  DEADLINE_REMINDER = 'deadline_reminder',
  COMPETITION_END = 'competition_end',
  RESULTS_AVAILABLE = 'results_available'
}

// API Request/Response types
export interface CreateCompetitionRequest {
  name: string;
  description: string;
  type: CompetitionType;
  startDate: string;
  endDate: string;
  requirements: Omit<CompetitionRequirement, 'id'>[];
  rewards: Omit<CompetitionReward, 'id'>[];
  validationRules: Omit<ValidationRule, 'id'>[];
  tags?: string[];
  categories?: string[];
  difficultyLevel?: Competition['difficultyLevel'];
  maxParticipants?: number;
}

export interface UpdateCompetitionRequest {
  name?: string;
  description?: string;
  status?: CompetitionStatus;
  requirements?: CompetitionRequirement[];
  rewards?: CompetitionReward[];
  validationRules?: ValidationRule[];
  tags?: string[];
}

export interface RegisterParticipationRequest {
  competitionId: string;
  githubUsername?: string;
  gitlabUsername?: string;
  registrationData?: Record<string, any>;
}

export interface CreateCampaignRequest {
  name: string;
  description: string;
  competitionIds: string[];
  invitedStudents: string[];
  startDate: string;
  endDate: string;
  customRequirements?: Omit<CompetitionRequirement, 'id'>[];
  bonusPoints?: number;
  notificationSettings?: NotificationSettings;
}

export interface SubmitEntryRequest {
  participationId: string;
  requirementId: string;
  type: Submission['type'];
  title: string;
  description: string;
  url: string;
  repositoryUrl?: string;
  metadata?: Record<string, any>;
}

// Analytics and reporting types
export interface CompetitionAnalytics {
  competitionId: string;
  totalParticipants: number;
  activeParticipants: number;
  completionRate: number;
  averageScore: number;
  topPerformers: ParticipantSummary[];
  requirementStats: RequirementStats[];
  timelineData: TimelineDataPoint[];
  geographicDistribution: GeographicData[];
}

export interface ParticipantSummary {
  userId: string;
  username: string;
  score: number;
  rank: number;
  completedRequirements: number;
  totalRequirements: number;
  achievements: number;
}

export interface RequirementStats {
  requirementId: string;
  name: string;
  completionRate: number;
  averageScore: number;
  totalSubmissions: number;
  approvedSubmissions: number;
}

export interface TimelineDataPoint {
  date: string;
  registrations: number;
  submissions: number;
  completions: number;
  activeUsers: number;
}

export interface GeographicData {
  country: string;
  participants: number;
  completionRate: number;
}

// Error types
export class CompetitionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CompetitionError';
  }
}

export class ValidationError extends CompetitionError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends CompetitionError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends CompetitionError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ExternalAPIError extends CompetitionError {
  constructor(
    message: string,
    public platform: string,
    public originalError?: any
  ) {
    super(`External API error (${platform}): ${message}`, 'EXTERNAL_API_ERROR', 502);
    this.name = 'ExternalAPIError';
  }
}