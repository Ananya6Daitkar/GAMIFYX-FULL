/**
 * Data models for analytics service
 */

export interface StudentPerformanceData {
  userId: string;
  timestamp: Date;
  submissionId?: string;
  codeQualityScore: number;
  completionTime: number;
  testCoverage: number;
  securityScore: number;
  feedbackImplementationRate: number;
  skillTags: string[];
  metadata?: Record<string, any>;
}

export interface RiskScore {
  userId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  calculatedAt: Date;
  validUntil: Date;
  recommendations: string[];
  metadata?: Record<string, any>;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  userId?: string;
  cohortId?: string;
  title: string;
  message: string;
  data: Record<string, any>;
  status: AlertStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  escalationLevel: number;
  notificationChannels: NotificationChannel[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  cooldownMinutes: number;
  escalationRules: EscalationRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  timeWindow: string; // e.g., '5m', '1h', '1d'
  aggregation: 'avg' | 'sum' | 'count' | 'min' | 'max';
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'slack';
  target: string;
  template: string;
  parameters: Record<string, any>;
}

export interface EscalationRule {
  level: number;
  delayMinutes: number;
  actions: AlertAction[];
}

export interface PerformanceTrend {
  userId: string;
  metric: string;
  timeframe: string;
  dataPoints: TrendDataPoint[];
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number; // -1 to 1
  prediction: TrendPrediction;
  calculatedAt: Date;
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TrendPrediction {
  nextValue: number;
  confidence: number;
  timeHorizon: string;
  factors: string[];
}

export interface CohortAnalysis {
  cohortId: string;
  name: string;
  studentCount: number;
  metrics: CohortMetrics;
  riskDistribution: RiskDistribution;
  trends: PerformanceTrend[];
  recommendations: string[];
  calculatedAt: Date;
}

export interface CohortMetrics {
  averageCodeQuality: number;
  averageCompletionTime: number;
  averageTestCoverage: number;
  averageSecurityScore: number;
  submissionFrequency: number;
  engagementScore: number;
  retentionRate: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface SystemHealthMetrics {
  timestamp: Date;
  goldenSignals: GoldenSignals;
  serviceMetrics: ServiceMetrics[];
  alertsSummary: AlertsSummary;
  performanceSummary: PerformanceSummary;
}

export interface GoldenSignals {
  latency: LatencyMetrics;
  traffic: TrafficMetrics;
  errors: ErrorMetrics;
  saturation: SaturationMetrics;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  average: number;
}

export interface TrafficMetrics {
  requestsPerSecond: number;
  activeUsers: number;
  peakConcurrency: number;
}

export interface ErrorMetrics {
  errorRate: number;
  totalErrors: number;
  errorsByType: Record<string, number>;
}

export interface SaturationMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  diskUtilization: number;
  networkUtilization: number;
}

export interface ServiceMetrics {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  throughput: number;
  availability: number;
}

export interface AlertsSummary {
  total: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<AlertSeverity, number>;
  recentAlerts: Alert[];
}

export interface PerformanceSummary {
  totalStudents: number;
  activeStudents: number;
  averageRiskScore: number;
  studentsAtRisk: number;
  improvingStudents: number;
  decliningStudents: number;
}

export interface AnalyticsReport {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  parameters: Record<string, any>;
  data: any;
  format: 'json' | 'csv' | 'pdf';
  generatedAt: Date;
  generatedBy: string;
  expiresAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: AlertType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

// Enums
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertType {
  PERFORMANCE_DECLINE = 'performance_decline',
  HIGH_RISK_STUDENT = 'high_risk_student',
  SYSTEM_HEALTH = 'system_health',
  COHORT_ANALYSIS = 'cohort_analysis',
  ENGAGEMENT_DROP = 'engagement_drop',
  QUALITY_DECLINE = 'quality_decline',
  SUBMISSION_ANOMALY = 'submission_anomaly'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app',
  SMS = 'sms'
}

export enum ReportType {
  STUDENT_PERFORMANCE = 'student_performance',
  COHORT_ANALYSIS = 'cohort_analysis',
  SYSTEM_HEALTH = 'system_health',
  RISK_ASSESSMENT = 'risk_assessment',
  TREND_ANALYSIS = 'trend_analysis'
}

// API Request/Response types
export interface CalculateRiskRequest {
  userId: string;
  includeFactors?: boolean;
  includeRecommendations?: boolean;
}

export interface AnalyzePerformanceRequest {
  userId: string;
  timeframe: string;
  metrics: string[];
}

export interface CreateAlertRuleRequest {
  name: string;
  description: string;
  type: AlertType;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes?: number;
  escalationRules?: EscalationRule[];
}

export interface GenerateReportRequest {
  type: ReportType;
  parameters: Record<string, any>;
  format: 'json' | 'csv' | 'pdf';
  title?: string;
  description?: string;
}

export interface CohortAnalysisRequest {
  cohortId?: string;
  studentIds?: string[];
  timeframe: string;
  includeRecommendations?: boolean;
}

export interface TrendAnalysisRequest {
  userId?: string;
  cohortId?: string;
  metrics: string[];
  timeframe: string;
  includePredictions?: boolean;
}

export interface AlertQueryRequest {
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  type?: AlertType[];
  userId?: string;
  cohortId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Response types
export interface RiskScoreResponse {
  userId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors?: RiskFactor[];
  recommendations?: string[];
  calculatedAt: Date;
  validUntil: Date;
}

export interface PerformanceAnalysisResponse {
  userId: string;
  timeframe: string;
  trends: PerformanceTrend[];
  summary: {
    overallTrend: 'improving' | 'declining' | 'stable';
    keyInsights: string[];
    recommendations: string[];
  };
  calculatedAt: Date;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  goldenSignals: GoldenSignals;
  services: ServiceMetrics[];
  alerts: AlertsSummary;
  performance: PerformanceSummary;
  timestamp: Date;
}

export interface AlertsResponse {
  alerts: Alert[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: AlertsSummary;
}

export interface CohortAnalysisResponse {
  cohort: CohortAnalysis;
  comparisons: {
    previousPeriod?: CohortMetrics;
    benchmark?: CohortMetrics;
  };
  actionItems: string[];
}

export interface TrendAnalysisResponse {
  trends: PerformanceTrend[];
  summary: {
    overallDirection: 'improving' | 'declining' | 'stable';
    keyTrends: string[];
    predictions: TrendPrediction[];
  };
  calculatedAt: Date;
}

// GitHub PR Tracking Models
export interface PullRequest {
  id: string;
  studentUsername: string;
  repository: string;
  repositoryUrl: string;
  prNumber: number;
  title: string;
  url: string;
  createdAt: Date;
  updatedAt?: Date;
  closedAt?: Date;
  mergedAt?: Date;
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
  lastPRSubmission?: Date;
  progressScore: number;
  trend: ProgressTrend;
  repositoriesContributed: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressTrend {
  direction: 'improving' | 'stable' | 'declining';
  percentage: number;
  timeframe: string;
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
  lastSync?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PRAnalysisCache {
  id: string;
  studentId: string;
  repositoryName: string;
  analysisPeriod: 'daily' | 'weekly' | 'monthly';
  totalPRs: number;
  mergedPRs: number;
  closedPRs: number;
  openPRs: number;
  avgPRSize: number;
  avgReviewTime: number;
  prFrequency: number;
  lastPRDate?: Date;
  progressScore: number;
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
  validUntil: Date;
}

// GitHub API Request/Response types
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

export interface StudentPRStatsResponse {
  studentId: string;
  githubUsername: string;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  lastPRDate?: Date;
  avgPRSize: number;
  trend: ProgressTrend;
  progressScore: number;
}

export interface ClassPROverviewRequest {
  teacherId: string;
  timeframe?: string;
}

export interface ClassPROverviewResponse {
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
  generatedAt: Date;
}