/**
 * GitHub PR Tracking Types
 */

export interface PullRequest {
  id: string;
  studentUsername: string;
  repository: string;
  repositoryUrl: string;
  prNumber: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
  mergedAt?: string;
  status: 'open' | 'closed' | 'merged';
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  linesChanged: number;
  filesChanged: number;
  reviewComments: number;
  isDraft: boolean;
  metadata?: Record<string, any>;
}

export interface StudentProgress {
  studentId: string;
  githubUsername: string;
  teacherId: string;
  totalPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  averagePRsPerWeek: number;
  lastPRSubmission?: string;
  progressScore: number;
  trend: ProgressTrend;
  repositoriesContributed: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgressTrend {
  direction: 'improving' | 'stable' | 'declining';
  percentage: number;
  timeframe: string;
}

export interface StudentPRStats {
  studentId: string;
  githubUsername: string;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  lastPRDate?: string;
  avgPRSize: number;
  trend: ProgressTrend;
  progressScore: number;
}

export interface ClassPROverview {
  teacherId: string;
  totalStudents: number;
  studentsWithPRs: number;
  totalPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  averagePRsPerStudent: number;
  topContributors: Array<{
    studentId: string;
    githubUsername: string;
    prCount: number;
  }>;
  repositoryStats: Array<{
    repositoryName: string;
    prCount: number;
    activeContributors: number;
  }>;
  generatedAt: string;
}

export interface GitHubRepository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  owner: string;
  teacherId: string;
  isActive: boolean;
  webhookUrl?: string;
  lastSync?: string;
  syncStatus: 'pending' | 'syncing' | 'completed' | 'error';
}

export interface StudentGitHubProfile {
  id: string;
  studentId: string;
  teacherId: string;
  githubUsername: string;
  githubUserId?: string;
  isVerified: boolean;
  verificationMethod?: 'manual' | 'oauth' | 'email';
  createdAt: string;
  updatedAt: string;
}

export interface PRAnalysisResult {
  studentId: string;
  githubUsername: string;
  analysisDate: string;
  prActivity: PRActivityAnalysis;
  progressScore: ProgressScore;
  trend: ProgressTrend;
  insights: ProgressInsight[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PRActivityAnalysis {
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  closedPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  prsLast30Days: number;
  averagePRsPerWeek: number;
  prFrequency: number;
  lastPRDate?: string;
  daysSinceLastPR?: number;
  longestStreak: number;
  currentStreak: number;
}

export interface ProgressScore {
  overall: number;
  activity: number;
  quality: number;
  consistency: number;
  improvement: number;
  breakdown: {
    prCount: number;
    mergeRate: number;
    frequency: number;
    consistency: number;
    recentActivity: number;
  };
}

export interface ProgressInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  category: 'activity' | 'quality' | 'consistency' | 'improvement' | 'engagement';
  message: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  data?: Record<string, any>;
}

export interface MonitoringAlert {
  id: string;
  type: 'student_at_risk' | 'no_activity' | 'declining_performance' | 'system_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  studentId?: string;
  teacherId?: string;
  message: string;
  data: Record<string, any>;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

// API Request/Response types
export interface FetchStudentPRsRequest {
  teacherId: string;
  studentUsername: string;
  repositories: string[];
}

export interface StudentPRStatsRequest {
  studentId: string;
  teacherId: string;
  timeframe?: string;
}

export interface ClassPROverviewRequest {
  teacherId: string;
  timeframe?: string;
}

// Component Props types
export interface StudentPRTrackerProps {
  studentId: string;
  teacherId: string;
  showDetails?: boolean;
  onViewDetails?: (studentId: string) => void;
}

export interface ClassPROverviewProps {
  teacherId: string;
  timeframe?: '7d' | '30d' | '90d';
  onTimeframeChange?: (timeframe: '7d' | '30d' | '90d') => void;
  onRefresh?: () => void;
}

export interface PRProgressChartProps {
  data: Array<{
    date: string;
    prs: number;
    merged: number;
    open: number;
  }>;
  height?: number;
}

export interface GitHubConfigPanelProps {
  teacherId: string;
  repositories: GitHubRepository[];
  studentMappings: StudentGitHubProfile[];
  onAddRepository: (repository: Omit<GitHubRepository, 'id'>) => void;
  onRemoveRepository: (repositoryId: string) => void;
  onAddStudentMapping: (mapping: Omit<StudentGitHubProfile, 'id'>) => void;
  onRemoveStudentMapping: (mappingId: string) => void;
  onSaveToken: (token: string) => void;
}