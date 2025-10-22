import { GitHubService, GitHubRepositoryData } from '@/services/GitHubService';
import axios, { AxiosInstance } from 'axios';

// Mock axios
jest.mock('axios');
jest.mock('@/telemetry/logger');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
} as unknown as jest.Mocked<AxiosInstance>;

describe('GitHubService', () => {
  let githubService: GitHubService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.create.mockReturnValue(mockAxiosInstance);
    githubService = new GitHubService();
  });

  describe('parseRepositoryUrl', () => {
    it('should parse GitHub repository URLs correctly', () => {
      // Test private method through reflection
      const parseRepositoryUrl = (githubService as any).parseRepositoryUrl.bind(githubService);

      expect(parseRepositoryUrl('https://github.com/Ananya6Daitkar/aiops-project')).toEqual({
        owner: 'Ananya6Daitkar',
        repo: 'aiops-project'
      });

      expect(parseRepositoryUrl('https://github.com/Ananya6Daitkar/docker-assignment.git')).toEqual({
        owner: 'Ananya6Daitkar',
        repo: 'docker-assignment'
      });

      expect(parseRepositoryUrl('Ananya6Daitkar/k8s-deployment')).toEqual({
        owner: 'Ananya6Daitkar',
        repo: 'k8s-deployment'
      });
    });

    it('should throw error for invalid URLs', () => {
      const parseRepositoryUrl = (githubService as any).parseRepositoryUrl.bind(githubService);

      expect(() => parseRepositoryUrl('invalid-url')).toThrow('Invalid GitHub repository URL');
    });
  });

  describe('processRepository', () => {
    const mockRepoInfo = {
      pushed_at: '2023-01-01T00:00:00Z',
      size: 1000
    };

    const mockLanguages = {
      'JavaScript': 5000,
      'TypeScript': 3000,
      'CSS': 1000
    };

    it('should process repository successfully', async () => {
      // Arrange
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockRepoInfo }) // getRepositoryInfo
        .mockResolvedValueOnce({ data: mockLanguages }) // getRepositoryLanguages
        .mockResolvedValueOnce({ data: [{ sha: 'commit1' }, { sha: 'commit2' }] }) // getCommitCount
        .mockResolvedValueOnce({ data: [{ login: 'user1' }, { login: 'user2' }] }) // getContributorCount
        .mockResolvedValueOnce({ data: [{ type: 'file', name: 'test.js' }] }) // getRepositoryFiles (for LOC)
        .mockResolvedValueOnce({ data: [{ type: 'file', name: 'test.js' }] }); // getFileCount

      // Mock file content for LOC calculation
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          type: 'file',
          content: Buffer.from('line1\nline2\nline3').toString('base64')
        }
      });

      // Act
      const result = await githubService.processRepository('https://github.com/Ananya6Daitkar/aiops-project');

      // Assert
      expect(result).toEqual({
        linesOfCode: expect.any(Number),
        complexity: expect.any(Number),
        languages: mockLanguages,
        commits: expect.any(Number),
        contributors: 2,
        lastCommitDate: new Date('2023-01-01T00:00:00Z'),
        fileCount: expect.any(Number)
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/Ananya6Daitkar/aiops-project');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/Ananya6Daitkar/aiops-project/languages');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        githubService.processRepository('https://github.com/Ananya6Daitkar/aiops-project')
      ).rejects.toThrow(apiError);
    });

    it('should process repository with commit hash', async () => {
      // Arrange
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockRepoInfo })
        .mockResolvedValueOnce({ data: mockLanguages })
        .mockResolvedValueOnce({ data: [{ sha: 'commit1' }] })
        .mockResolvedValueOnce({ data: [{ login: 'user1' }] })
        .mockResolvedValueOnce({ data: [{ type: 'file', name: 'test.js' }] })
        .mockResolvedValueOnce({ data: [{ type: 'file', name: 'test.js' }] });

      // Act
      const result = await githubService.processRepository(
        'https://github.com/Ananya6Daitkar/docker-assignment',
        'abc123'
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/repos/Ananya6Daitkar/docker-assignment/commits',
        { params: { sha: 'abc123', per_page: 1 } }
      );
    });
  });

  describe('setupWebhook', () => {
    it('should setup webhook successfully', async () => {
      // Arrange
      const webhookConfig = {
        url: 'https://example.com/webhook',
        secret: 'webhook-secret',
        events: ['push', 'pull_request']
      };

      mockAxiosInstance.post.mockResolvedValue({ data: { id: 123 } });

      // Act
      await githubService.setupWebhook('https://github.com/Ananya6Daitkar/aiops-project', webhookConfig);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/repos/Ananya6Daitkar/aiops-project/hooks',
        {
          name: 'web',
          active: true,
          events: webhookConfig.events,
          config: {
            url: webhookConfig.url,
            content_type: 'json',
            secret: webhookConfig.secret,
            insecure_ssl: '0'
          }
        }
      );
    });

    it('should handle webhook setup errors', async () => {
      // Arrange
      const webhookConfig = {
        url: 'https://example.com/webhook',
        secret: 'webhook-secret',
        events: ['push']
      };

      const webhookError = new Error('Webhook setup failed');
      mockAxiosInstance.post.mockRejectedValue(webhookError);

      // Act & Assert
      await expect(
        githubService.setupWebhook('https://github.com/Ananya6Daitkar/aiops-project', webhookConfig)
      ).rejects.toThrow(webhookError);
    });
  });

  describe('validateWebhookSignature', () => {
    it('should validate webhook signature correctly', async () => {
      // Arrange
      const payload = '{"test": "data"}';
      const secret = 'webhook-secret';
      
      // Create expected signature
      const crypto = require('crypto');
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Act
      const isValid = await githubService.validateWebhookSignature(
        payload,
        expectedSignature,
        secret
      );

      // Assert
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', async () => {
      // Arrange
      const payload = '{"test": "data"}';
      const secret = 'webhook-secret';
      const invalidSignature = 'sha256=invalid-signature';

      // Act
      const isValid = await githubService.validateWebhookSignature(
        payload,
        invalidSignature,
        secret
      );

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('getRepositoryFiles', () => {
    it('should get repository files', async () => {
      // Arrange
      const mockFiles = [
        { name: 'file1.js', type: 'file' },
        { name: 'file2.ts', type: 'file' }
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockFiles });

      // Act
      const result = await githubService.getRepositoryFiles('Ananya6Daitkar', 'aiops-project');

      // Assert
      expect(result).toEqual(mockFiles);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/repos/Ananya6Daitkar/aiops-project/contents/',
        { params: { path: '' } }
      );
    });

    it('should get repository files with commit hash', async () => {
      // Arrange
      const mockFiles = [{ name: 'file1.js', type: 'file' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockFiles });

      // Act
      await githubService.getRepositoryFiles('Ananya6Daitkar', 'docker-assignment', 'src', 'abc123');

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/repos/Ananya6Daitkar/docker-assignment/contents/src',
        { params: { path: 'src', ref: 'abc123' } }
      );
    });
  });

  describe('getFileContent', () => {
    it('should get file content', async () => {
      // Arrange
      const fileContent = 'console.log("Hello World");';
      const encodedContent = Buffer.from(fileContent).toString('base64');
      
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          type: 'file',
          content: encodedContent
        }
      });

      // Act
      const result = await githubService.getFileContent('Ananya6Daitkar', 'aiops-project', 'src/index.js');

      // Assert
      expect(result).toBe(fileContent);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/repos/Ananya6Daitkar/aiops-project/contents/src/index.js',
        { params: {} }
      );
    });

    it('should throw error for non-file paths', async () => {
      // Arrange
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          type: 'dir',
          content: ''
        }
      });

      // Act & Assert
      await expect(
        githubService.getFileContent('Ananya6Daitkar', 'aiops-project', 'src')
      ).rejects.toThrow('Path is not a file');
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity correctly', () => {
      // Test private method through reflection
      const calculateComplexity = (githubService as any).calculateComplexity.bind(githubService);

      const languages = {
        'JavaScript': 5000,
        'TypeScript': 3000,
        'Python': 2000
      };
      const linesOfCode = 1000;

      const complexity = calculateComplexity(languages, linesOfCode);

      expect(typeof complexity).toBe('number');
      expect(complexity).toBeGreaterThan(0);
    });

    it('should return 0 for empty languages', () => {
      const calculateComplexity = (githubService as any).calculateComplexity.bind(githubService);

      const complexity = calculateComplexity({}, 0);

      expect(complexity).toBe(0);
    });
  });

  describe('isCodeFile', () => {
    it('should identify code files correctly', () => {
      // Test private method through reflection
      const isCodeFile = (githubService as any).isCodeFile.bind(githubService);

      expect(isCodeFile('index.js')).toBe(true);
      expect(isCodeFile('component.tsx')).toBe(true);
      expect(isCodeFile('script.py')).toBe(true);
      expect(isCodeFile('main.cpp')).toBe(true);
      expect(isCodeFile('README.md')).toBe(false);
      expect(isCodeFile('image.png')).toBe(false);
      expect(isCodeFile('data.json')).toBe(false);
    });
  });
});