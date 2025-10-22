import axios, { AxiosInstance } from 'axios';
import { logger } from '@/telemetry/logger';
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('submission-service');
const meter = metrics.getMeter('submission-service', '1.0.0');

// Metrics
const githubApiCalls = meter.createCounter('github_api_calls_total', {
  description: 'Total number of GitHub API calls'
});

const githubApiDuration = meter.createHistogram('github_api_duration_seconds', {
  description: 'Duration of GitHub API calls'
});

export interface GitHubRepositoryData {
  linesOfCode: number;
  complexity: number;
  languages: Record<string, number>;
  commits: number;
  contributors: number;
  lastCommitDate: Date;
  fileCount: number;
}

export interface GitHubWebhookConfig {
  url: string;
  secret: string;
  events: string[];
}

export class GitHubService {
  private client: AxiosInstance;
  private token: string;

  constructor() {
    this.token = process.env.GITHUB_TOKEN || '';
    
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AIOps-Learning-Platform/1.0'
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for metrics
    this.client.interceptors.request.use(
      (config) => {
        (config as any).metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for metrics and logging
    this.client.interceptors.response.use(
      (response) => {
        const duration = (Date.now() - (response.config as any).metadata.startTime) / 1000;
        
        githubApiCalls.add(1, { 
          method: response.config.method?.toUpperCase() || 'UNKNOWN',
          status: response.status.toString()
        });
        
        githubApiDuration.record(duration, {
          method: response.config.method?.toUpperCase() || 'UNKNOWN',
          status: response.status.toString()
        });

        return response;
      },
      (error) => {
        const duration = (error.config as any)?.metadata ? 
          (Date.now() - (error.config as any).metadata.startTime) / 1000 : 0;
        
        githubApiCalls.add(1, { 
          method: error.config?.method?.toUpperCase() || 'UNKNOWN',
          status: error.response?.status?.toString() || 'ERROR'
        });
        
        if (duration > 0) {
          githubApiDuration.record(duration, {
            method: error.config?.method?.toUpperCase() || 'UNKNOWN',
            status: error.response?.status?.toString() || 'ERROR'
          });
        }

        logger.error('GitHub API error', {
          error: error.message,
          status: error.response?.status,
          url: error.config?.url
        });

        return Promise.reject(error);
      }
    );
  }

  async processRepository(repositoryUrl: string, commitHash?: string): Promise<GitHubRepositoryData> {
    const span = tracer.startSpan('github_process_repository');
    
    try {
      const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
      
      span.setAttributes({
        'github.owner': owner,
        'github.repo': repo,
        'github.commit': commitHash || 'latest'
      });

      // Get repository information
      const [repoInfo, languages, commits, contributors] = await Promise.all([
        this.getRepositoryInfo(owner, repo),
        this.getRepositoryLanguages(owner, repo),
        this.getCommitCount(owner, repo, commitHash),
        this.getContributorCount(owner, repo)
      ]);

      // Calculate lines of code and complexity
      const linesOfCode = await this.calculateLinesOfCode(owner, repo, commitHash);
      const complexity = this.calculateComplexity(languages, linesOfCode);

      const result: GitHubRepositoryData = {
        linesOfCode,
        complexity,
        languages,
        commits,
        contributors,
        lastCommitDate: new Date(repoInfo.pushed_at),
        fileCount: await this.getFileCount(owner, repo, commitHash)
      };

      span.setAttributes({ 'operation.success': true });
      
      logger.info('Repository processed successfully', {
        owner,
        repo,
        commitHash,
        result
      });

      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Failed to process repository', {
        error,
        repositoryUrl,
        commitHash
      });
      
      throw error;
    } finally {
      span.end();
    }
  }

  async setupWebhook(repositoryUrl: string, config: GitHubWebhookConfig): Promise<void> {
    const span = tracer.startSpan('github_setup_webhook');
    
    try {
      const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
      
      span.setAttributes({
        'github.owner': owner,
        'github.repo': repo,
        'webhook.url': config.url
      });

      const webhookData = {
        name: 'web',
        active: true,
        events: config.events,
        config: {
          url: config.url,
          content_type: 'json',
          secret: config.secret,
          insecure_ssl: '0'
        }
      };

      await this.client.post(`/repos/${owner}/${repo}/hooks`, webhookData);

      span.setAttributes({ 'operation.success': true });
      
      logger.info('Webhook setup successfully', {
        owner,
        repo,
        webhookUrl: config.url,
        events: config.events
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Failed to setup webhook', {
        error,
        repositoryUrl,
        webhookUrl: config.url
      });
      
      throw error;
    } finally {
      span.end();
    }
  }

  async validateWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    const crypto = require('crypto');
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async getRepositoryFiles(owner: string, repo: string, path: string = '', commitHash?: string): Promise<any[]> {
    const span = tracer.startSpan('github_get_repository_files');
    
    try {
      const params: any = { path };
      if (commitHash) {
        params.ref = commitHash;
      }

      const response = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, {
        params
      });

      span.setAttributes({ 'operation.success': true });
      
      return response.data;
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      throw error;
    } finally {
      span.end();
    }
  }

  async getFileContent(owner: string, repo: string, filePath: string, commitHash?: string): Promise<string> {
    const span = tracer.startSpan('github_get_file_content');
    
    try {
      const params: any = {};
      if (commitHash) {
        params.ref = commitHash;
      }

      const response = await this.client.get(`/repos/${owner}/${repo}/contents/${filePath}`, {
        params
      });

      if (response.data.type !== 'file') {
        throw new Error('Path is not a file');
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      
      span.setAttributes({ 'operation.success': true });
      
      return content;
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      throw error;
    } finally {
      span.end();
    }
  }

  private parseRepositoryUrl(repositoryUrl: string): { owner: string; repo: string } {
    // Handle different GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /github\.com\/([^\/]+)\/([^\/]+?)\/$/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = repositoryUrl.match(pattern);
      if (match) {
        return { owner: match[1]!, repo: match[2]! };
      }
    }

    throw new Error(`Invalid GitHub repository URL: ${repositoryUrl}`);
  }

  private async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    const response = await this.client.get(`/repos/${owner}/${repo}`);
    return response.data;
  }

  private async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const response = await this.client.get(`/repos/${owner}/${repo}/languages`);
    return response.data;
  }

  private async getCommitCount(owner: string, repo: string, commitHash?: string): Promise<number> {
    try {
      const params: any = { per_page: 1 };
      if (commitHash) {
        params.sha = commitHash;
      }

      const response = await this.client.get(`/repos/${owner}/${repo}/commits`, {
        params
      });

      // GitHub doesn't provide total count directly, so we estimate based on pagination
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastPageMatch) {
          return parseInt(lastPageMatch[1]) * 30; // Approximate
        }
      }

      return response.data.length;
    } catch (error) {
      logger.warn('Failed to get commit count', { error, owner, repo });
      return 0;
    }
  }

  private async getContributorCount(owner: string, repo: string): Promise<number> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/contributors`);
      return response.data.length;
    } catch (error) {
      logger.warn('Failed to get contributor count', { error, owner, repo });
      return 0;
    }
  }

  private async calculateLinesOfCode(owner: string, repo: string, commitHash?: string): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd need to recursively fetch all files and count lines
      const files = await this.getRepositoryFiles(owner, repo, '', commitHash);
      
      let totalLines = 0;
      const codeFiles = files.filter(file => 
        file.type === 'file' && 
        this.isCodeFile(file.name)
      );

      // Sample a few files to estimate (to avoid API rate limits)
      const sampleSize = Math.min(codeFiles.length, 10);
      const sampleFiles = codeFiles.slice(0, sampleSize);

      for (const file of sampleFiles) {
        try {
          const content = await this.getFileContent(owner, repo, file.path, commitHash);
          totalLines += content.split('\n').length;
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      // Extrapolate based on sample
      if (sampleSize > 0) {
        totalLines = Math.round((totalLines / sampleSize) * codeFiles.length);
      }

      return totalLines;
    } catch (error) {
      logger.warn('Failed to calculate lines of code', { error, owner, repo });
      return 0;
    }
  }

  private async getFileCount(owner: string, repo: string, commitHash?: string): Promise<number> {
    try {
      const files = await this.getRepositoryFiles(owner, repo, '', commitHash);
      return files.filter(file => file.type === 'file').length;
    } catch (error) {
      logger.warn('Failed to get file count', { error, owner, repo });
      return 0;
    }
  }

  private calculateComplexity(languages: Record<string, number>, linesOfCode: number): number {
    // Simple complexity calculation based on languages and lines of code
    const complexityWeights: Record<string, number> = {
      'JavaScript': 1.2,
      'TypeScript': 1.3,
      'Python': 1.1,
      'Java': 1.4,
      'C++': 1.6,
      'C': 1.5,
      'Go': 1.2,
      'Rust': 1.4,
      'HTML': 0.5,
      'CSS': 0.6,
      'Shell': 1.0
    };

    let weightedComplexity = 0;
    let totalBytes = 0;

    for (const [language, bytes] of Object.entries(languages)) {
      const weight = complexityWeights[language] || 1.0;
      weightedComplexity += bytes * weight;
      totalBytes += bytes;
    }

    if (totalBytes === 0) return 0;

    const averageComplexity = weightedComplexity / totalBytes;
    const sizeComplexity = Math.log10(linesOfCode + 1) / 4; // Logarithmic scale for size

    return Math.round((averageComplexity + sizeComplexity) * 10) / 10;
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.cs',
      '.sh', '.bash', '.sql', '.r', '.m', '.pl', '.lua'
    ];

    return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }
}