/**
 * Comprehensive Submission Service with AI Integration for GamifyX
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Submission,
  SubmissionType,
  SubmissionStatus,
  SubmissionPriority,
  SubmissionMetadata,
  AIAnalysisResult,
  GamificationData
} from '../models/Submission';
import { SubmissionRepository } from '../repositories/SubmissionRepository';
import { GitHubService } from './GitHubService';
import { AIAnalysisService } from './AIAnalysisService';
import { CodeAnalysisService } from './CodeAnalysisService';
import { SecurityScanService } from './SecurityScanService';
import { TestingService } from './TestingService';
import { GamificationIntegrationService } from './GamificationIntegrationService';
import { GamifyXTelemetry } from '../../../shared/telemetry';
import { GamifyXMetrics } from '../../../shared/telemetry/metrics';
import { DistributedTracing } from '../../../shared/telemetry/tracing';

export interface SubmissionRequest {
  userId: string;
  title: string;
  description: string;
  repositoryUrl: string;
  branch?: string;
  submissionType: SubmissionType;
  priority?: SubmissionPriority;
  tags?: string[];
  dueDate?: Date;
  metadata?: Partial<SubmissionMetadata>;
}

export interface SubmissionResult {
  success: boolean;
  submission?: Submission;
  error?: string;
  validationErrors?: string[];
}

export interface ProcessingResult {
  success: boolean;
  submission?: Submission;
  processingTime: number;
  error?: string;
  warnings?: string[];
}

export interface SubmissionSearchFilters {
  userId?: string;
  status?: SubmissionStatus;
  type?: SubmissionType;
  priority?: SubmissionPriority;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  minScore?: number;
  maxScore?: number;
  language?: string;
  hasVulnerabilities?: boolean;
}

export interface SubmissionSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'score' | 'priority';
  sortOrder?: 'ASC' | 'DESC';
  includeMetrics?: boolean;
  includeFeedback?: boolean;
  includeAIAnalysis?: boolean;
}

export class SubmissionService {
  private submissionRepository: SubmissionRepository;
  private githubService: GitHubService;
  private aiAnalysisService: AIAnalysisService;
  private codeAnalysisService: CodeAnalysisService;
  private securityScanService: SecurityScanService;
  private testingService: TestingService;
  private gamificationService: GamificationIntegrationService;
  private telemetry: GamifyXTelemetry;
  private metrics: GamifyXMetrics;
  private tracing: DistributedTracing;

  constructor(
    submissionRepository: SubmissionRepository,
    githubService: GitHubService,
    aiAnalysisService: AIAnalysisService,
    codeAnalysisService: CodeAnalysisService,
    securityScanService: SecurityScanService,
    testingService: TestingService,
    gamificationService: GamificationIntegrationService,
    telemetry: GamifyXTelemetry,
    metrics: GamifyXMetrics,
    tracing: DistributedTracing
  ) {
    this.submissionRepository = submissionRepository;
    this.githubService = githubService;
    this.aiAnalysisService = aiAnalysisService;
    this.codeAnalysisService = codeAnalysisService;
    this.securityScanService = securityScanService;
    this.testingService = testingService;
    this.gamificationService = gamificationService;
    this.telemetry = telemetry;
    this.metrics = metrics;
    this.tracing = tracing;
  }

  // Create new submission
  public async createSubmission(request: SubmissionRequest): Promise<SubmissionResult> {
    return this.telemetry.traceAsync(
      'submission.create',
      async () => {
        try {
          // Validate submission request
          const validationErrors = await this.validateSubmissionRequest(request);
          if (validationErrors.length > 0) {
            return {
              success: false,
              validationErrors,
            };
          }

          // Validate repository access
          const repoValidation = await this.githubService.validateRepository(request.repositoryUrl);
          if (!repoValidation.isValid) {
            return {
              success: false,
              error: `Repository validation failed: ${repoValidation.error}`,
            };
          }

          // Get latest commit hash
          const commitHash = await this.githubService.getLatestCommitHash(
            request.repositoryUrl,
            request.branch || 'main'
          );

          // Create submission entity
          const submission: Submission = {
            id: uuidv4(),
            userId: request.userId,
            title: request.title,
            description: request.description,
            repositoryUrl: request.repositoryUrl,
            commitHash,
            branch: request.branch || 'main',
            submissionType: request.submissionType,
            status: SubmissionStatus.SUBMITTED,
            priority: request.priority || SubmissionPriority.NORMAL,
            tags: request.tags || [],
            metadata: await this.initializeMetadata(request),
            metrics: this.initializeMetrics(),
            feedback: [],
            aiAnalysis: this.initializeAIAnalysis(),
            gamificationData: this.initializeGamificationData(),
            createdAt: new Date(),
            updatedAt: new Date(),
            submittedAt: new Date(),
            dueDate: request.dueDate,
          };

          // Save submission
          const savedSubmission = await this.submissionRepository.create(submission);

          // Queue for processing
          await this.queueSubmissionForProcessing(savedSubmission.id);

          // Record metrics
          this.metrics.recordSubmissionProcessed(
            request.userId,
            request.submissionType,
            'created',
            0
          );

          return {
            success: true,
            submission: savedSubmission,
          };
        } catch (error) {
          this.metrics.recordSubmissionProcessed(
            request.userId,
            request.submissionType,
            'failed',
            0
          );
          throw error;
        }
      },
      {
        'submission.type': request.submissionType,
        'submission.user_id': request.userId,
        'submission.repository': request.repositoryUrl,
      }
    );
  }

  // Process submission with comprehensive analysis
  public async processSubmission(submissionId: string): Promise<ProcessingResult> {
    return this.tracing.traceSubmissionFlow(
      'system',
      submissionId,
      'processing',
      async () => {
        const startTime = Date.now();
        
        try {
          // Get submission
          const submission = await this.submissionRepository.findById(submissionId);
          if (!submission) {
            return {
              success: false,
              error: 'Submission not found',
              processingTime: Date.now() - startTime,
            };
          }

          // Update status to processing
          await this.updateSubmissionStatus(submissionId, SubmissionStatus.PROCESSING);

          // Clone repository
          const repoPath = await this.githubService.cloneRepository(
            submission.repositoryUrl,
            submission.branch,
            submission.commitHash
          );

          // Run parallel analysis
          const [
            codeAnalysis,
            securityScan,
            testResults,
            aiAnalysis
          ] = await Promise.all([
            this.codeAnalysisService.analyzeCode(repoPath, submission.metadata),
            this.securityScanService.scanCode(repoPath, submission.metadata),
            this.testingService.runTests(repoPath, submission.metadata),
            this.aiAnalysisService.analyzeSubmission(repoPath, submission)
          ]);

          // Combine metrics
          const combinedMetrics = this.combineAnalysisResults(
            codeAnalysis,
            securityScan,
            testResults
          );

          // Generate feedback
          const feedback = await this.generateComprehensiveFeedback(
            codeAnalysis,
            securityScan,
            testResults,
            aiAnalysis
          );

          // Calculate gamification data
          const gamificationData = await this.gamificationService.calculateGamificationRewards(
            submission,
            combinedMetrics,
            aiAnalysis
          );

          // Update submission with results
          const updatedSubmission = await this.submissionRepository.update(submissionId, {
            status: SubmissionStatus.COMPLETED,
            metrics: combinedMetrics,
            feedback,
            aiAnalysis,
            gamificationData,
            completedAt: new Date(),
            updatedAt: new Date(),
          });

          // Apply gamification rewards
          await this.gamificationService.applyRewards(submission.userId, gamificationData);

          // Clean up temporary files
          await this.githubService.cleanupRepository(repoPath);

          const processingTime = Date.now() - startTime;

          // Record metrics
          this.metrics.recordSubmissionProcessed(
            submission.userId,
            submission.submissionType,
            'completed',
            processingTime
          );

          return {
            success: true,
            submission: updatedSubmission!,
            processingTime,
          };
        } catch (error) {
          // Update status to failed
          await this.updateSubmissionStatus(submissionId, SubmissionStatus.FAILED);
          
          const processingTime = Date.now() - startTime;
          
          this.metrics.recordSubmissionProcessed(
            'unknown',
            'unknown' as any,
            'failed',
            processingTime
          );

          return {
            success: false,
            error: (error as Error).message,
            processingTime,
          };
        }
      }
    );
  }

  // Get submission by ID
  public async getSubmission(submissionId: string): Promise<Submission | null> {
    return this.telemetry.traceAsync(
      'submission.get',
      async () => {
        return await this.submissionRepository.findById(submissionId);
      },
      { 'submission.id': submissionId }
    );
  }

  // Get submissions for user
  public async getUserSubmissions(
    userId: string,
    filters: SubmissionSearchFilters = {},
    options: SubmissionSearchOptions = {}
  ): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }> {
    return this.telemetry.traceAsync(
      'submission.get_user_submissions',
      async () => {
        const searchFilters = { ...filters, userId };
        return await this.submissionRepository.searchSubmissions(searchFilters, options);
      },
      { 'user.id': userId }
    );
  }

  // Search submissions
  public async searchSubmissions(
    filters: SubmissionSearchFilters,
    options: SubmissionSearchOptions = {}
  ): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }> {
    return this.telemetry.traceAsync(
      'submission.search',
      async () => {
        return await this.submissionRepository.searchSubmissions(filters, options);
      },
      { 'search.filters': JSON.stringify(filters) }
    );
  }

  // Update submission status
  public async updateSubmissionStatus(submissionId: string, status: SubmissionStatus): Promise<boolean> {
    return this.telemetry.traceAsync(
      'submission.update_status',
      async () => {
        const updated = await this.submissionRepository.update(submissionId, {
          status,
          updatedAt: new Date(),
        });
        return updated !== null;
      },
      { 'submission.id': submissionId, 'submission.status': status }
    );
  }

  // Reprocess submission
  public async reprocessSubmission(submissionId: string): Promise<ProcessingResult> {
    return this.telemetry.traceAsync(
      'submission.reprocess',
      async () => {
        // Reset submission status
        await this.updateSubmissionStatus(submissionId, SubmissionStatus.QUEUED);
        
        // Process again
        return await this.processSubmission(submissionId);
      },
      { 'submission.id': submissionId }
    );
  }

  // Get submission statistics
  public async getSubmissionStatistics(userId?: string): Promise<any> {
    return this.telemetry.traceAsync(
      'submission.get_statistics',
      async () => {
        return await this.submissionRepository.getSubmissionStatistics(userId);
      },
      { 'user.id': userId }
    );
  }

  // Private helper methods
  private async validateSubmissionRequest(request: SubmissionRequest): Promise<string[]> {
    const errors: string[] = [];

    if (!request.title || request.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!request.description || request.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!request.repositoryUrl || !this.isValidGitHubUrl(request.repositoryUrl)) {
      errors.push('Valid GitHub repository URL is required');
    }

    if (!Object.values(SubmissionType).includes(request.submissionType)) {
      errors.push('Invalid submission type');
    }

    if (request.dueDate && request.dueDate < new Date()) {
      errors.push('Due date cannot be in the past');
    }

    return errors;
  }

  private isValidGitHubUrl(url: string): boolean {
    const githubUrlPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/;
    return githubUrlPattern.test(url);
  }

  private async initializeMetadata(request: SubmissionRequest): Promise<SubmissionMetadata> {
    // Detect language and framework from repository
    const repoInfo = await this.githubService.getRepositoryInfo(request.repositoryUrl);
    
    return {
      language: repoInfo.language || 'unknown',
      framework: repoInfo.framework,
      dependencies: [],
      environment: {
        operatingSystem: 'linux',
        architecture: 'x64',
        containerized: false,
      },
      buildConfig: {
        buildTool: 'npm',
        buildScript: 'build',
        outputDirectory: 'dist',
        optimizations: [],
        minification: false,
        sourceMap: true,
      },
      testConfig: {
        testFramework: 'jest',
        testRunner: 'npm',
        testFiles: [],
        coverageThreshold: 80,
        testEnvironment: 'node',
        parallelExecution: false,
      },
      securityConfig: {
        scanEnabled: true,
        scanTools: ['trivy', 'semgrep'],
        complianceStandards: ['OWASP'],
        secretsScanning: true,
        dependencyScanning: true,
        staticAnalysis: true,
      },
      ...request.metadata,
    };
  }

  private initializeMetrics(): any {
    return {
      linesOfCode: 0,
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maintainabilityIndex: 0,
        technicalDebt: 0,
        codeSmells: [],
      },
      testCoverage: {
        linesCovered: 0,
        totalLines: 0,
        coveragePercentage: 0,
        branchCoverage: 0,
        functionCoverage: 0,
        statementCoverage: 0,
        uncoveredLines: [],
        testFiles: [],
      },
      performance: {
        buildTime: 0,
        testExecutionTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      security: {
        vulnerabilities: [],
        securityScore: 100,
        riskLevel: 'very_low' as any,
        complianceChecks: [],
        secretsDetected: [],
        dependencyVulnerabilities: [],
      },
      quality: {
        overallScore: 0,
        codeStyle: 0,
        bestPractices: 0,
        errorHandling: 0,
        documentation: 0,
        testQuality: 0,
        issues: [],
      },
      maintainability: {
        maintainabilityIndex: 0,
        technicalDebtRatio: 0,
        duplicatedLines: 0,
        duplicatedBlocks: 0,
        refactoringOpportunities: [],
      },
      documentation: {
        coveragePercentage: 0,
        readmeQuality: 0,
        codeComments: 0,
        apiDocumentation: 0,
        missingDocumentation: [],
      },
    };
  }

  private initializeAIAnalysis(): AIAnalysisResult {
    return {
      overallAssessment: '',
      strengths: [],
      weaknesses: [],
      recommendations: [],
      skillAssessment: [],
      learningPath: [],
      predictedScore: 0,
      confidenceLevel: 0,
      analysisVersion: '1.0.0',
      processingTime: 0,
    };
  }

  private initializeGamificationData(): GamificationData {
    return {
      pointsEarned: 0,
      bonusPoints: 0,
      badgesEarned: [],
      achievementsUnlocked: [],
      streakContribution: false,
      leaderboardImpact: 0,
      experienceGained: 0,
      levelProgress: 0,
    };
  }

  private async queueSubmissionForProcessing(submissionId: string): Promise<void> {
    // In a real implementation, this would add to a job queue (Redis, Bull, etc.)
    // For now, we'll process immediately in the background
    setTimeout(() => {
      this.processSubmission(submissionId).catch(error => {
        console.error(`Failed to process submission ${submissionId}:`, error);
      });
    }, 1000);
  }

  private combineAnalysisResults(codeAnalysis: any, securityScan: any, testResults: any): any {
    // Combine results from different analysis services
    return {
      ...this.initializeMetrics(),
      linesOfCode: codeAnalysis.linesOfCode || 0,
      complexity: codeAnalysis.complexity || this.initializeMetrics().complexity,
      testCoverage: testResults.coverage || this.initializeMetrics().testCoverage,
      performance: {
        buildTime: codeAnalysis.buildTime || 0,
        testExecutionTime: testResults.executionTime || 0,
        memoryUsage: testResults.memoryUsage || 0,
        cpuUsage: testResults.cpuUsage || 0,
      },
      security: securityScan.security || this.initializeMetrics().security,
      quality: codeAnalysis.quality || this.initializeMetrics().quality,
      maintainability: codeAnalysis.maintainability || this.initializeMetrics().maintainability,
      documentation: codeAnalysis.documentation || this.initializeMetrics().documentation,
    };
  }

  private async generateComprehensiveFeedback(
    codeAnalysis: any,
    securityScan: any,
    testResults: any,
    aiAnalysis: AIAnalysisResult
  ): Promise<any[]> {
    const feedback: any[] = [];

    // Add code analysis feedback
    if (codeAnalysis.issues) {
      feedback.push(...codeAnalysis.issues);
    }

    // Add security feedback
    if (securityScan.vulnerabilities) {
      feedback.push(...securityScan.vulnerabilities);
    }

    // Add test feedback
    if (testResults.issues) {
      feedback.push(...testResults.issues);
    }

    // Add AI-generated feedback
    if (aiAnalysis.recommendations) {
      feedback.push(...aiAnalysis.recommendations.map((rec: any) => ({
        id: uuidv4(),
        type: 'improvement',
        category: rec.category,
        severity: rec.priority,
        title: rec.title,
        message: rec.description,
        suggestion: rec.actionItems.join('; '),
        aiGenerated: true,
        confidence: 85,
        createdAt: new Date(),
        learningResources: [],
      })));
    }

    return feedback;
  }
}

export default SubmissionService;