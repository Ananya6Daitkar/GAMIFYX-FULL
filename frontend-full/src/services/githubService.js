/**
 * GitHub Integration Service
 * Handles all GitHub API interactions for PR tracking
 */

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = null;
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = null;
  }

  /**
   * Set GitHub authentication token
   * @param {string} token - GitHub personal access token
   */
  setAuthToken(token) {
    this.token = token;
    localStorage.setItem('github_token', token);
  }

  /**
   * Get stored GitHub token
   * @returns {string|null} - Stored token or null
   */
  getAuthToken() {
    if (!this.token) {
      this.token = localStorage.getItem('github_token');
    }
    return this.token;
  }

  /**
   * Validate GitHub token
   * @returns {Promise<boolean>} - Token validity
   */
  async validateToken() {
    const token = this.getAuthToken();
    if (!token) return false;

    try {
      const response = await this.makeRequest('/user');
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Make authenticated request to GitHub API
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise<Response>} - Fetch response
   */
  async makeRequest(endpoint, options = {}) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('GitHub token not set');
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GamifyX-AIOps-Platform',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Update rate limit info
    this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
    this.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Get rate limit status
   * @returns {object} - Rate limit information
   */
  getRateLimitStatus() {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
      resetDate: new Date(this.rateLimitReset * 1000)
    };
  }

  /**
   * Fetch pull requests for a specific repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} options - Query options
   * @returns {Promise<Array>} - Array of pull requests
   */
  async fetchRepositoryPRs(owner, repo, options = {}) {
    const {
      state = 'all',
      sort = 'created',
      direction = 'desc',
      per_page = 100,
      page = 1
    } = options;

    const endpoint = `/repos/${owner}/${repo}/pulls?state=${state}&sort=${sort}&direction=${direction}&per_page=${per_page}&page=${page}`;
    
    try {
      const response = await this.makeRequest(endpoint);
      const prs = await response.json();
      
      return prs.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        authorId: pr.user.id,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        closedAt: pr.closed_at,
        mergedAt: pr.merged_at,
        htmlUrl: pr.html_url,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        repository: {
          owner,
          name: repo,
          fullName: `${owner}/${repo}`
        }
      }));
    } catch (error) {
      console.error(`Error fetching PRs for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Fetch pull requests for a specific user across repositories
   * @param {string} username - GitHub username
   * @param {Array<string>} repositories - Array of repository full names (owner/repo)
   * @returns {Promise<Array>} - Array of user's pull requests
   */
  async fetchUserPRs(username, repositories) {
    const allPRs = [];

    for (const repoFullName of repositories) {
      const [owner, repo] = repoFullName.split('/');
      
      try {
        const prs = await this.fetchRepositoryPRs(owner, repo);
        const userPRs = prs.filter(pr => pr.author === username);
        allPRs.push(...userPRs);
      } catch (error) {
        console.error(`Error fetching PRs for ${username} in ${repoFullName}:`, error);
        // Continue with other repositories even if one fails
      }
    }

    return allPRs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Fetch pull requests for multiple students
   * @param {Array<object>} studentMappings - Array of {studentId, githubUsername} objects
   * @param {Array<string>} repositories - Array of repository full names
   * @returns {Promise<object>} - Object with studentId as key and PRs as value
   */
  async fetchStudentsPRs(studentMappings, repositories) {
    const results = {};

    for (const mapping of studentMappings) {
      const { studentId, githubUsername } = mapping;
      
      try {
        const prs = await this.fetchUserPRs(githubUsername, repositories);
        results[studentId] = {
          githubUsername,
          prs,
          totalPRs: prs.length,
          openPRs: prs.filter(pr => pr.state === 'open').length,
          closedPRs: prs.filter(pr => pr.state === 'closed').length,
          mergedPRs: prs.filter(pr => pr.mergedAt).length,
          lastActivity: prs.length > 0 ? prs[0].createdAt : null
        };
      } catch (error) {
        console.error(`Error fetching PRs for student ${studentId} (${githubUsername}):`, error);
        results[studentId] = {
          githubUsername,
          prs: [],
          totalPRs: 0,
          openPRs: 0,
          closedPRs: 0,
          mergedPRs: 0,
          lastActivity: null,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} - Repository information
   */
  async getRepositoryInfo(owner, repo) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}`);
      const repoData = await response.json();
      
      return {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        owner: repoData.owner.login,
        description: repoData.description,
        private: repoData.private,
        htmlUrl: repoData.html_url,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        language: repoData.language,
        stargazersCount: repoData.stargazers_count,
        forksCount: repoData.forks_count,
        openIssuesCount: repoData.open_issues_count
      };
    } catch (error) {
      console.error(`Error fetching repository info for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Search for repositories
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>} - Array of repositories
   */
  async searchRepositories(query, options = {}) {
    const {
      sort = 'updated',
      order = 'desc',
      per_page = 30,
      page = 1
    } = options;

    const endpoint = `/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=${order}&per_page=${per_page}&page=${page}`;
    
    try {
      const response = await this.makeRequest(endpoint);
      const data = await response.json();
      
      return data.items.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count
      }));
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw error;
    }
  }

  /**
   * Get authenticated user information
   * @returns {Promise<object>} - User information
   */
  async getAuthenticatedUser() {
    try {
      const response = await this.makeRequest('/user');
      const userData = await response.json();
      
      return {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
        company: userData.company,
        location: userData.location,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following
      };
    } catch (error) {
      console.error('Error fetching authenticated user:', error);
      throw error;
    }
  }
}

// Create singleton instance
const githubService = new GitHubService();

export default githubService;