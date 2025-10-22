/**
 * Advanced Submission models for GamifyX platform
 */

export interface Submission {
  id: string;
  userId: string;
  title: string;
  description: string;
  repositoryUrl: string;
  commitHash: string;
  branch: string;
  submissionType: SubmissionType;
  status: SubmissionStatus;
  priority: SubmissionPriority;
  tags: string[];
  metadata: SubmissionMetadata;
  metrics: SubmissionMetrics;
  feedback: SubmissionFeedback[];
  aiAnalysis: AIAnalysisResult;
  gamificationData: GamificationData;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
}

export interface SubmissionMetadata {
  language: string;
  framework?: string;
  dependencies: Dependency[];
  environment: EnvironmentInfo;
  buildConfig: BuildConfiguration;
  testConfig: TestConfiguration;
  deploymentConfig?: DeploymentConfiguration;
  securityConfig: SecurityConfiguration;
}

export interface SubmissionMetrics {
  linesOfCode: number;
  complexity: ComplexityMetrics;
  testCoverage: TestCoverageMetrics;
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  quality: QualityMetrics;
  maintainability: MaintainabilityMetrics;
  documentation: DocumentationMetrics;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // minutes
  codeSmells: CodeSmell[];
}

export interface TestCoverageMetrics {
  linesCovered: number;
  totalLines: number;
  coveragePercentage: number;
  branchCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
  uncoveredLines: number[];
  testFiles: TestFileInfo[];
}

export interface PerformanceMetrics {
  buildTime: number; // seconds
  testExecutionTime: number; // seconds
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  bundleSize?: number; // bytes
  loadTime?: number; // milliseconds
  responseTime?: number; // milliseconds
}

export interface SecurityMetrics {
  vulnerabilities: SecurityVulnerability[];
  securityScore: number; // 0-100
  riskLevel: SecurityRiskLevel;
  complianceChecks: ComplianceCheck[];
  secretsDetected: SecretDetection[];
  dependencyVulnerabilities: DependencyVulnerability[];
}

export interface QualityMetrics {
  overallScore: number; // 0-100
  codeStyle: number; // 0-100
  bestPractices: number; // 0-100
  errorHandling: number; // 0-100
  documentation: number; // 0-100
  testQuality: number; // 0-100
  issues: QualityIssue[];
}

export interface MaintainabilityMetrics {
  maintainabilityIndex: number; // 0-100
  technicalDebtRatio: number; // percentage
  duplicatedLines: number;
  duplicatedBlocks: number;
  refactoringOpportunities: RefactoringOpportunity[];
}

export interface DocumentationMetrics {
  coveragePercentage: number;
  readmeQuality: number; // 0-100
  codeComments: number;
  apiDocumentation: number; // 0-100
  missingDocumentation: string[];
}

export interface SubmissionFeedback {
  id: string;
  type: FeedbackType;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  title: string;
  message: string;
  suggestion: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  codeSnippet?: string;
  fixSuggestion?: string;
  learningResources: LearningResource[];
  aiGenerated: boolean;
  confidence: number; // 0-100
  createdAt: Date;
}

export interface AIAnalysisResult {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: AIRecommendation[];
  skillAssessment: SkillAssessment[];
  learningPath: LearningPathSuggestion[];
  predictedScore: number; // 0-100
  confidenceLevel: number; // 0-100
  analysisVersion: string;
  processingTime: number; // milliseconds
}

export interface GamificationData {
  pointsEarned: number;
  bonusPoints: number;
  badgesEarned: BadgeEarned[];
  achievementsUnlocked: AchievementUnlocked[];
  streakContribution: boolean;
  leaderboardImpact: number;
  experienceGained: number;
  levelProgress: number;
}

// Supporting interfaces
export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
  vulnerabilities: number;
  license: string;
  outdated: boolean;
}

export interface EnvironmentInfo {
  nodeVersion?: string;
  pythonVersion?: string;
  javaVersion?: string;
  operatingSystem: string;
  architecture: string;
  containerized: boolean;
  cloudProvider?: string;
}

export interface BuildConfiguration {
  buildTool: string;
  buildScript: string;
  outputDirectory: string;
  optimizations: string[];
  minification: boolean;
  sourceMap: boolean;
}

export interface TestConfiguration {
  testFramework: string;
  testRunner: string;
  testFiles: string[];
  coverageThreshold: number;
  testEnvironment: string;
  parallelExecution: boolean;
}

export interface DeploymentConfiguration {
  platform: string;
  environment: string;
  containerImage?: string;
  healthCheckEndpoint?: string;
  scalingConfig?: ScalingConfiguration;
  environmentVariables: Record<string, string>;
}

export interface SecurityConfiguration {
  scanEnabled: boolean;
  scanTools: string[];
  complianceStandards: string[];
  secretsScanning: boolean;
  dependencyScanning: boolean;
  staticAnalysis: boolean;
}

export interface CodeSmell {
  type: string;
  description: string;
  filePath: string;
  lineNumber: number;
  severity: 'minor' | 'major' | 'critical';
  effort: number; // minutes to fix
}

export interface TestFileInfo {
  filePath: string;
  testCount: number;
  coverage: number;
  duration: number; // milliseconds
  status: 'passed' | 'failed' | 'skipped';
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: SecuritySeverity;
  description: string;
  filePath: string;
  lineNumber: number;
  cwe?: string;
  cvss?: number;
  fixRecommendation: string;
}

export interface ComplianceCheck {
  standard: string;
  rule: string;
  status: 'passed' | 'failed' | 'warning';
  description: string;
  remediation?: string;
}

export interface SecretDetection {
  type: string;
  filePath: string;
  lineNumber: number;
  confidence: number;
  masked: boolean;
}

export interface DependencyVulnerability {
  dependency: string;
  version: string;
  vulnerabilityId: string;
  severity: SecuritySeverity;
  description: string;
  fixedVersion?: string;
}

export interface QualityIssue {
  rule: string;
  category: string;
  severity: 'info' | 'minor' | 'major' | 'critical';
  message: string;
  filePath: string;
  lineNumber: number;
  effort: number; // minutes
}

export interface RefactoringOpportunity {
  type: string;
  description: string;
  filePath: string;
  lineNumber: number;
  impact: 'low' | 'medium' | 'high';
  effort: number; // hours
}

export interface LearningResource {
  type: 'article' | 'video' | 'documentation' | 'tutorial' | 'course';
  title: string;
  url: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
}

export interface AIRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SkillAssessment {
  skill: string;
  currentLevel: number; // 1-10
  demonstratedLevel: number; // 1-10
  confidence: number; // 0-100
  evidence: string[];
  improvementAreas: string[];
}

export interface LearningPathSuggestion {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  steps: LearningStep[];
  estimatedTime: number; // hours
  priority: number; // 1-10
}

export interface LearningStep {
  title: string;
  description: string;
  resources: LearningResource[];
  estimatedTime: number; // hours
  prerequisites: string[];
}

export interface BadgeEarned {
  badgeId: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  earnedAt: Date;
}

export interface AchievementUnlocked {
  achievementId: string;
  title: string;
  description: string;
  points: number;
  rarity: AchievementRarity;
  unlockedAt: Date;
}

export interface ScalingConfiguration {
  minInstances: number;
  maxInstances: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
}

// Enums
export enum SubmissionType {
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  CHALLENGE = 'challenge',
  HACKATHON = 'hackathon',
  PORTFOLIO = 'portfolio',
  CERTIFICATION = 'certification',
  PRACTICE = 'practice'
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  ANALYZING = 'analyzing',
  TESTING = 'testing',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
  RESUBMISSION_REQUIRED = 'resubmission_required'
}

export enum SubmissionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum FeedbackType {
  CODE_QUALITY = 'code_quality',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BEST_PRACTICES = 'best_practices',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  ARCHITECTURE = 'architecture',
  MAINTAINABILITY = 'maintainability'
}

export enum FeedbackCategory {
  ERROR = 'error',
  WARNING = 'warning',
  SUGGESTION = 'suggestion',
  IMPROVEMENT = 'improvement',
  COMPLIMENT = 'compliment'
}

export enum FeedbackSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SecurityRiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SecuritySeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum AchievementRarity {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

export default Submission;