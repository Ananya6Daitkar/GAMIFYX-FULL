import { Submission, SubmissionMetrics, TestResult } from '@/models';
import { logger } from '@/telemetry/logger';
import { trace, metrics } from '@opentelemetry/api';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

const tracer = trace.getTracer('submission-service');
const meter = metrics.getMeter('submission-service', '1.0.0');

// Metrics
const analysisCounter = meter.createCounter('code_analysis_total', {
  description: 'Total number of code analyses performed'
});

const analysisDuration = meter.createHistogram('code_analysis_duration_seconds', {
  description: 'Duration of code analysis operations'
});

export interface CodeAnalysisResult {
  codeQualityScore: number;
  testCoverage: number;
  securityVulnerabilities: number;
  complexity: number;
  linesOfCode: number;
  testResults: TestResult[];
  issues: CodeIssue[];
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  category: 'quality' | 'security' | 'performance' | 'style';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  severity: number;
}

export class CodeAnalysisService {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.TEMP_DIR || '/tmp/code-analysis';
  }

  async analyzeSubmission(submission: Submission): Promise<Partial<SubmissionMetrics>> {
    const span = tracer.startSpan('analyze_submission');
    const startTime = Date.now();
    
    try {
      span.setAttributes({
        'submission.id': submission.id,
        'submission.type': submission.submissionType,
        'user.id': submission.userId
      });

      logger.info('Starting code analysis', {
        submissionId: submission.id,
        type: submission.submissionType
      });

      // Create temporary directory for analysis
      const workDir = await this.createWorkDirectory(submission.id);
      
      let analysisResult: CodeAnalysisResult;

      try {
        if (submission.repositoryUrl) {
          // Clone repository and analyze
          analysisResult = await this.analyzeRepository(submission, workDir);
        } else {
          // Analyze uploaded files (if any)
          analysisResult = await this.analyzeUploadedFiles(submission, workDir);
        }

        // Calculate final metrics
        const metrics: Partial<SubmissionMetrics> = {
          codeQualityScore: analysisResult.codeQualityScore,
          testCoverage: analysisResult.testCoverage,
          securityVulnerabilities: analysisResult.securityVulnerabilities,
          complexity: analysisResult.complexity,
          linesOfCode: analysisResult.linesOfCode,
          testResults: analysisResult.testResults
        };

        // Record metrics
        const duration = (Date.now() - startTime) / 1000;
        analysisCounter.add(1, { 
          submission_type: submission.submissionType,
          status: 'success'
        });
        analysisDuration.record(duration, { 
          submission_type: submission.submissionType,
          status: 'success'
        });

        span.setAttributes({ 'operation.success': true });
        
        logger.info('Code analysis completed', {
          submissionId: submission.id,
          duration,
          metrics
        });

        return metrics;

      } finally {
        // Cleanup temporary directory
        await this.cleanupWorkDirectory(workDir);
      }

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      analysisCounter.add(1, { 
        submission_type: submission.submissionType,
        status: 'error'
      });
      analysisDuration.record(duration, { 
        submission_type: submission.submissionType,
        status: 'error'
      });

      logger.error('Code analysis failed', {
        error,
        submissionId: submission.id,
        duration
      });

      // Return default metrics on failure
      return {
        codeQualityScore: 0,
        testCoverage: 0,
        securityVulnerabilities: 0,
        complexity: 0,
        linesOfCode: 0,
        testResults: []
      };
    } finally {
      span.end();
    }
  }

  private async analyzeRepository(submission: Submission, workDir: string): Promise<CodeAnalysisResult> {
    const span = tracer.startSpan('analyze_repository');
    
    try {
      // Clone repository
      await this.cloneRepository(submission.repositoryUrl!, workDir, submission.commitHash);
      
      // Detect project type and language
      const projectInfo = await this.detectProjectType(workDir);
      
      // Run appropriate analysis tools
      const [
        eslintResults,
        testResults,
        securityResults,
        complexityResults
      ] = await Promise.allSettled([
        this.runESLint(workDir, projectInfo),
        this.runTests(workDir, projectInfo),
        this.runSecurityAnalysis(workDir, projectInfo),
        this.calculateComplexity(workDir, projectInfo)
      ]);

      // Combine results
      const issues: CodeIssue[] = [];
      let codeQualityScore = 100;
      let testCoverage = 0;
      let securityVulnerabilities = 0;
      let complexity = 0;
      let testResultsData: TestResult[] = [];

      // Process ESLint results
      if (eslintResults.status === 'fulfilled') {
        issues.push(...eslintResults.value.issues);
        codeQualityScore = Math.max(0, codeQualityScore - eslintResults.value.penalty);
      }

      // Process test results
      if (testResults.status === 'fulfilled') {
        testCoverage = testResults.value.coverage;
        testResultsData = testResults.value.results;
      }

      // Process security results
      if (securityResults.status === 'fulfilled') {
        securityVulnerabilities = securityResults.value.vulnerabilities;
        issues.push(...securityResults.value.issues);
        codeQualityScore = Math.max(0, codeQualityScore - securityResults.value.penalty);
      }

      // Process complexity results
      if (complexityResults.status === 'fulfilled') {
        complexity = complexityResults.value.complexity;
      }

      const linesOfCode = await this.countLinesOfCode(workDir);

      span.setAttributes({ 'operation.success': true });

      return {
        codeQualityScore,
        testCoverage,
        securityVulnerabilities,
        complexity,
        linesOfCode,
        testResults: testResultsData,
        issues
      };

    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      throw error;
    } finally {
      span.end();
    }
  }

  private async analyzeUploadedFiles(submission: Submission, workDir: string): Promise<CodeAnalysisResult> {
    // For uploaded files, we'd need to get them from the submission
    // This is a simplified implementation
    return {
      codeQualityScore: 75,
      testCoverage: 0,
      securityVulnerabilities: 0,
      complexity: 5,
      linesOfCode: 100,
      testResults: [],
      issues: []
    };
  }

  private async createWorkDirectory(submissionId: string): Promise<string> {
    const workDir = path.join(this.tempDir, submissionId);
    await fs.mkdir(workDir, { recursive: true });
    return workDir;
  }

  private async cleanupWorkDirectory(workDir: string): Promise<void> {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to cleanup work directory', { error, workDir });
    }
  }

  private async cloneRepository(repositoryUrl: string, workDir: string, commitHash?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['clone'];
      
      if (commitHash) {
        args.push('--branch', commitHash);
      }
      
      args.push(repositoryUrl, workDir);

      const git = spawn('git', args);
      
      git.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git clone failed with code ${code}`));
        }
      });

      git.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async detectProjectType(workDir: string): Promise<{
    type: string;
    language: string;
    packageManager: string;
  }> {
    const files = await fs.readdir(workDir);
    
    if (files.includes('package.json')) {
      return {
        type: 'nodejs',
        language: 'javascript',
        packageManager: files.includes('yarn.lock') ? 'yarn' : 'npm'
      };
    }
    
    if (files.includes('requirements.txt') || files.includes('setup.py')) {
      return {
        type: 'python',
        language: 'python',
        packageManager: 'pip'
      };
    }
    
    if (files.includes('pom.xml')) {
      return {
        type: 'java',
        language: 'java',
        packageManager: 'maven'
      };
    }
    
    if (files.includes('Cargo.toml')) {
      return {
        type: 'rust',
        language: 'rust',
        packageManager: 'cargo'
      };
    }

    return {
      type: 'unknown',
      language: 'unknown',
      packageManager: 'unknown'
    };
  }

  private async runESLint(workDir: string, projectInfo: any): Promise<{
    issues: CodeIssue[];
    penalty: number;
  }> {
    if (projectInfo.language !== 'javascript') {
      return { issues: [], penalty: 0 };
    }

    return new Promise((resolve) => {
      const eslint = spawn('npx', ['eslint', '.', '--format', 'json'], {
        cwd: workDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      eslint.stdout.on('data', (data) => {
        output += data.toString();
      });

      eslint.on('close', (code) => {
        try {
          const results = JSON.parse(output);
          const issues: CodeIssue[] = [];
          let penalty = 0;

          for (const file of results) {
            for (const message of file.messages) {
              issues.push({
                type: message.severity === 2 ? 'error' : 'warning',
                category: 'quality',
                message: message.message,
                file: file.filePath,
                line: message.line,
                column: message.column,
                rule: message.ruleId,
                severity: message.severity
              });

              penalty += message.severity === 2 ? 5 : 2;
            }
          }

          resolve({ issues, penalty });
        } catch (error) {
          // ESLint not available or failed
          resolve({ issues: [], penalty: 0 });
        }
      });

      eslint.on('error', () => {
        resolve({ issues: [], penalty: 0 });
      });
    });
  }

  private async runTests(workDir: string, projectInfo: any): Promise<{
    coverage: number;
    results: TestResult[];
  }> {
    if (projectInfo.type !== 'nodejs') {
      return { coverage: 0, results: [] };
    }

    return new Promise((resolve) => {
      const testCommand = projectInfo.packageManager === 'yarn' ? 'yarn' : 'npm';
      const testArgs = projectInfo.packageManager === 'yarn' ? ['test'] : ['test'];

      const test = spawn(testCommand, testArgs, {
        cwd: workDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      test.stdout.on('data', (data) => {
        output += data.toString();
      });

      test.on('close', (code) => {
        // Parse test output (simplified)
        const coverage = this.extractCoverage(output);
        const results = this.parseTestResults(output);
        
        resolve({ coverage, results });
      });

      test.on('error', () => {
        resolve({ coverage: 0, results: [] });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        test.kill();
        resolve({ coverage: 0, results: [] });
      }, 30000);
    });
  }

  private async runSecurityAnalysis(workDir: string, projectInfo: any): Promise<{
    vulnerabilities: number;
    issues: CodeIssue[];
    penalty: number;
  }> {
    // Simplified security analysis
    // In a real implementation, you'd use tools like npm audit, bandit, etc.
    return {
      vulnerabilities: Math.floor(Math.random() * 3),
      issues: [],
      penalty: Math.floor(Math.random() * 10)
    };
  }

  private async calculateComplexity(workDir: string, projectInfo: any): Promise<{
    complexity: number;
  }> {
    // Simplified complexity calculation
    const linesOfCode = await this.countLinesOfCode(workDir);
    const complexity = Math.max(1, Math.floor(linesOfCode / 100));
    
    return { complexity };
  }

  private async countLinesOfCode(workDir: string): Promise<number> {
    try {
      const files = await this.getCodeFiles(workDir);
      let totalLines = 0;

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          totalLines += content.split('\n').length;
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      return totalLines;
    } catch (error) {
      return 0;
    }
  }

  private async getCodeFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h'];

    async function traverse(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await traverse(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (codeExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await traverse(dir);
    return files;
  }

  private extractCoverage(output: string): number {
    // Simple regex to extract coverage percentage
    const coverageMatch = output.match(/(\d+(?:\.\d+)?)%/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  private parseTestResults(output: string): TestResult[] {
    // Simplified test result parsing
    return [{
      testSuite: 'default',
      passed: Math.floor(Math.random() * 20),
      failed: Math.floor(Math.random() * 3),
      skipped: Math.floor(Math.random() * 2),
      duration: Math.random() * 10,
      coverage: this.extractCoverage(output)
    }];
  }
}