import { logger } from '@/telemetry/logger';
import { GitHubAdapter } from './GitHubAdapter';
import { 
  ExternalAPIConfig,
  ContributionData,
  ValidationRequirements,
  ValidationResult
} from './BaseExternalAPIAdapter';

/**
 * Hacktoberfest-specific adapter that extends GitHub adapter
 * Implements Hacktoberfest-specific validation rules and requirements
 */
export class HacktoberfestAdapter extends GitHubAdapter {
  private hacktoberfestYear: number;
  private hacktoberfestStartDate: Date;
  private hacktoberfestEndDate: Date;

  constructor(year: number = new Date().getFullYear()) {
    super();
    this.platform = 'Hacktoberfest';
    this.hacktoberfestYear = year;
    this.hacktoberfestStartDate = new Date(year, 9, 1); // October 1st
    this.hacktoberfestEndDate = new Date(year, 9, 31, 23, 59, 59); // October 31st
  }

  async initialize(config: ExternalAPIConfig): Promise<void> {
    await super.initialize(config);
    logger.info(`Hacktoberfest adapter initialized for year ${this.hacktoberfestYear}`);
  }

  /**
   * Fetch Hacktoberfest-specific contributions
   * Only returns contributions made during Hacktoberfest period
   */
  async fetchHacktoberfestContributions(username: string): Promise<ContributionData[]> {
    return this.fetchContributions(username, this.hacktoberfestStartDate, this.hacktoberfestEndDate);
  }

  /**
   * Validate contribution against Hacktoberfest rules
   */
  async validateContribution(contribution: ContributionData, requirements?: ValidationRequirements): Promise<ValidationResult> {
    // Use Hacktoberfest-specific requirements if none provided
    const hacktoberfestRequirements: ValidationRequirements = {
      requireApproval: true,
      excludeLabels: ['spam', 'invalid', 'hacktoberfest-invalid'],
      includeLabels: ['hacktoberfest-accepted'],
      minLinesChanged: 1,
      repositoryRequirements: {
        mustBePublic: true,
        excludeOwn: false // Allow contributions to own repos
      },
      timeframe: {
        start: this.hacktoberfestStartDate,
        end: this.hacktoberfestEndDate
      },
      ...requirements
    };

    const result = await super.validateContribution(contribution, hacktoberfestRequirements);

    // Apply additional Hacktoberfest-specific validation
    return this.applyHacktoberfestSpecificRules(contribution, result);
  }

  private async applyHacktoberfestSpecificRules(contribution: ContributionData, baseResult: ValidationResult): Promise<ValidationResult> {
    const reasons = [...baseResult.reasons];
    let score = baseResult.score;

    // Only validate pull requests for Hacktoberfest
    if (contribution.type !== 'pull_request') {
      return {
        valid: false,
        score: 0,
        maxScore: baseResult.maxScore,
        reasons: ['Only pull requests count for Hacktoberfest'],
        metadata: {
          ...baseResult.metadata,
          hacktoberfestSpecific: true
        }
      };
    }

    // Check if contribution is within Hacktoberfest timeframe
    if (contribution.createdAt < this.hacktoberfestStartDate || contribution.createdAt > this.hacktoberfestEndDate) {
      return {
        valid: false,
        score: 0,
        maxScore: baseResult.maxScore,
        reasons: [`Pull request created outside Hacktoberfest period (${this.hacktoberfestYear})`],
        metadata: {
          ...baseResult.metadata,
          hacktoberfestSpecific: true
        }
      };
    }

    // Check for Hacktoberfest-accepted label (highest priority)
    if (contribution.labels.includes('hacktoberfest-accepted')) {
      score = Math.max(score, 90);
      reasons.push('Has hacktoberfest-accepted label');
    }

    // Check for spam/invalid labels (immediate disqualification)
    const invalidLabels = ['spam', 'invalid', 'hacktoberfest-invalid'];
    const hasInvalidLabel = invalidLabels.some(label => contribution.labels.includes(label));
    if (hasInvalidLabel) {
      return {
        valid: false,
        score: 0,
        maxScore: baseResult.maxScore,
        reasons: ['Pull request marked as spam or invalid'],
        metadata: {
          ...baseResult.metadata,
          hacktoberfestSpecific: true,
          disqualified: true
        }
      };
    }

    // Check repository participation in Hacktoberfest
    const repoParticipates = await this.checkRepositoryHacktoberfestParticipation(contribution.repositoryName);
    if (repoParticipates) {
      score += 10;
      reasons.push('Repository participates in Hacktoberfest');
    }

    // Check for quality indicators
    const qualityScore = await this.assessPullRequestQuality(contribution);
    score = Math.min(100, score + qualityScore.bonus);
    reasons.push(...qualityScore.reasons);

    // Final validation: PR must be merged, approved, or have hacktoberfest-accepted label
    const isValidForHacktoberfest = 
      contribution.status === 'merged' ||
      contribution.labels.includes('hacktoberfest-accepted') ||
      await this.isPullRequestApproved(contribution);

    if (!isValidForHacktoberfest) {
      score = Math.min(score, 40); // Cap score for unmerged/unapproved PRs
      reasons.push('Pull request not merged, approved, or accepted for Hacktoberfest');
    }

    return {
      valid: score >= 60, // Higher threshold for Hacktoberfest
      score,
      maxScore: baseResult.maxScore,
      reasons,
      metadata: {
        ...baseResult.metadata,
        hacktoberfestSpecific: true,
        hacktoberfestYear: this.hacktoberfestYear,
        qualityAssessment: qualityScore
      }
    };
  }

  private async checkRepositoryHacktoberfestParticipation(repositoryName: string): Promise<boolean> {
    try {
      const topics = await this.getRepositoryTopics(repositoryName);
      return topics.includes('hacktoberfest');
    } catch (error) {
      logger.debug(`Could not check Hacktoberfest participation for ${repositoryName}`, { error });
      return false;
    }
  }

  private async assessPullRequestQuality(contribution: ContributionData): Promise<{
    bonus: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let bonus = 0;

    // Check PR description quality
    if (contribution.description && contribution.description.length > 100) {
      bonus += 5;
      reasons.push('Detailed pull request description');
    }

    // Check for meaningful changes
    const additions = contribution.metadata.additions || 0;
    const deletions = contribution.metadata.deletions || 0;
    const totalChanges = additions + deletions;

    if (totalChanges >= 10) {
      bonus += 10;
      reasons.push(`Substantial changes: ${totalChanges} lines`);
    } else if (totalChanges >= 5) {
      bonus += 5;
      reasons.push(`Moderate changes: ${totalChanges} lines`);
    }

    // Check for documentation changes
    if (contribution.title.toLowerCase().includes('doc') || 
        contribution.description.toLowerCase().includes('documentation')) {
      bonus += 5;
      reasons.push('Includes documentation improvements');
    }

    // Check for test additions
    if (contribution.title.toLowerCase().includes('test') || 
        contribution.description.toLowerCase().includes('test')) {
      bonus += 5;
      reasons.push('Includes test improvements');
    }

    // Penalize very small changes that might be spam
    if (totalChanges < 3 && !contribution.labels.includes('hacktoberfest-accepted')) {
      bonus -= 10;
      reasons.push('Very small changes - potential spam');
    }

    return { bonus, reasons };
  }

  private async isPullRequestApproved(contribution: ContributionData): Promise<boolean> {
    try {
      const [owner, repo] = contribution.repositoryName.split('/');
      const prNumber = contribution.metadata.number;

      const reviewsResponse = await this.octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: prNumber
      });

      return reviewsResponse.data.some(review => review.state === 'APPROVED');
    } catch (error) {
      logger.debug(`Could not check approval status for PR ${contribution.id}`, { error });
      return false;
    }
  }

  /**
   * Get comprehensive Hacktoberfest participation status
   */
  async getHacktoberfestStatus(username: string): Promise<{
    year: number;
    eligible: boolean;
    progress: {
      validPRs: number;
      totalPRs: number;
      requiredPRs: number;
      completed: boolean;
    };
    pullRequests: Array<{
      id: string;
      title: string;
      url: string;
      repository: string;
      status: 'valid' | 'invalid' | 'pending' | 'spam';
      createdAt: Date;
      validationDetails: {
        score: number;
        reasons: string[];
        labels: string[];
      };
    }>;
    timeline: Array<{
      date: Date;
      event: string;
      description: string;
    }>;
    recommendations: string[];
  }> {
    const contributions = await this.fetchHacktoberfestContributions(username);
    const pullRequests = contributions.filter(c => c.type === 'pull_request');

    const validatedPRs = await Promise.all(
      pullRequests.map(async (pr) => {
        const validation = await this.validateContribution(pr);
        
        let status: 'valid' | 'invalid' | 'pending' | 'spam';
        if (pr.labels.some(label => ['spam', 'invalid', 'hacktoberfest-invalid'].includes(label))) {
          status = 'spam';
        } else if (validation.valid) {
          status = 'valid';
        } else if (pr.status === 'open') {
          status = 'pending';
        } else {
          status = 'invalid';
        }

        return {
          id: pr.id,
          title: pr.title,
          url: pr.url,
          repository: pr.repositoryName,
          status,
          createdAt: pr.createdAt,
          validationDetails: {
            score: validation.score,
            reasons: validation.reasons,
            labels: pr.labels
          }
        };
      })
    );

    const validPRs = validatedPRs.filter(pr => pr.status === 'valid').length;
    const requiredPRs = 4;
    const completed = validPRs >= requiredPRs;

    // Generate timeline
    const timeline = pullRequests
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(pr => ({
        date: pr.createdAt,
        event: 'Pull Request Created',
        description: `Created "${pr.title}" in ${pr.repositoryName}`
      }));

    // Generate recommendations
    const recommendations: string[] = [];
    if (!completed) {
      const remaining = requiredPRs - validPRs;
      recommendations.push(`Create ${remaining} more valid pull request${remaining > 1 ? 's' : ''} to complete Hacktoberfest`);
    }

    const pendingPRs = validatedPRs.filter(pr => pr.status === 'pending').length;
    if (pendingPRs > 0) {
      recommendations.push(`You have ${pendingPRs} pending pull request${pendingPRs > 1 ? 's' : ''} - follow up with maintainers`);
    }

    const invalidPRs = validatedPRs.filter(pr => pr.status === 'invalid').length;
    if (invalidPRs > 0) {
      recommendations.push('Focus on creating substantial, meaningful contributions to increase validation scores');
    }

    if (validPRs === 0) {
      recommendations.push('Look for repositories with the "hacktoberfest" topic for participating projects');
      recommendations.push('Read contribution guidelines carefully before submitting pull requests');
    }

    return {
      year: this.hacktoberfestYear,
      eligible: completed,
      progress: {
        validPRs,
        totalPRs: pullRequests.length,
        requiredPRs,
        completed
      },
      pullRequests: validatedPRs,
      timeline,
      recommendations
    };
  }

  /**
   * Get Hacktoberfest leaderboard data for multiple users
   */
  async getHacktoberfestLeaderboard(usernames: string[]): Promise<Array<{
    username: string;
    validPRs: number;
    totalPRs: number;
    completed: boolean;
    score: number;
    rank: number;
  }>> {
    const results = await Promise.all(
      usernames.map(async (username) => {
        try {
          const status = await this.getHacktoberfestStatus(username);
          const score = status.pullRequests.reduce((sum, pr) => sum + pr.validationDetails.score, 0);
          
          return {
            username,
            validPRs: status.progress.validPRs,
            totalPRs: status.progress.totalPRs,
            completed: status.progress.completed,
            score
          };
        } catch (error) {
          logger.error(`Failed to get Hacktoberfest status for ${username}`, { error });
          return {
            username,
            validPRs: 0,
            totalPRs: 0,
            completed: false,
            score: 0
          };
        }
      })
    );

    // Sort by score and assign ranks
    const sorted = results.sort((a, b) => b.score - a.score);
    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1
    }));
  }
}