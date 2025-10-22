export interface SubmissionWorkflowData {
  submissionId: string;
  userId: string;
  repositoryUrl?: string;
  codeContent?: string;
  submissionType: 'assignment' | 'project' | 'challenge';
  metadata?: {
    language?: string;
    framework?: string;
    difficulty?: string;
    tags?: string[];
  };
}

export interface WorkflowStep {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface WorkflowResult {
  success: boolean;
  submissionId: string;
  steps?: {
    validation: WorkflowStep;
    submission: WorkflowStep;
    feedback: WorkflowStep;
    gamification: WorkflowStep;
    analytics: WorkflowStep;
  };
  error?: string;
  completedAt: Date;
}

export interface ServiceEndpoints {
  userService: string;
  submissionService: string;
  gamificationService: string;
  feedbackService: string;
  analyticsService: string;
  aiFeedbackService: string;
}

export interface FeedbackResult {
  submissionId: string;
  overallScore: number;
  securityScore: number;
  codeQuality: {
    score: number;
    issues: Array<{
      type: string;
      severity: string;
      message: string;
      line?: number;
    }>;
  };
  suggestions: Array<{
    category: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  learningResources: Array<{
    title: string;
    url: string;
    type: 'documentation' | 'tutorial' | 'example';
  }>;
}

export interface GamificationUpdate {
  userId: string;
  pointsAwarded: number;
  newTotalPoints: number;
  badgesEarned: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
  }>;
  levelUp?: {
    previousLevel: number;
    newLevel: number;
  };
  leaderboardPosition: number;
}

export interface AnalyticsData {
  userId: string;
  submissionId: string;
  timestamp: Date;
  metrics: {
    codeQualityScore: number;
    completionTime: number;
    testCoverage: number;
    securityScore: number;
    feedbackScore: number;
  };
  riskScore?: number;
  performanceTrend?: 'improving' | 'stable' | 'declining';
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}