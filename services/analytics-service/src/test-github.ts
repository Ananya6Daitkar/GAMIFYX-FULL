/**
 * Simple test script for GitHub integration
 */

import { GitHubService } from './services/githubService';
import { GitHubTokenManager } from './services/githubTokenManager';
import { GitHubClient } from './services/githubClient';

async function testGitHubIntegration() {
  console.log('Testing GitHub Integration...');

  // Test 1: Create GitHub service instance
  try {
    const githubService = GitHubService.getInstance();
    console.log('✓ GitHub service instance created');
  } catch (error) {
    console.error('✗ Failed to create GitHub service:', error);
    return;
  }

  // Test 2: Create token manager instance
  try {
    const tokenManager = GitHubTokenManager.getInstance();
    console.log('✓ Token manager instance created');
  } catch (error) {
    console.error('✗ Failed to create token manager:', error);
    return;
  }

  // Test 3: Create GitHub client
  try {
    const client = new GitHubClient();
    console.log('✓ GitHub client created');
    
    // Test rate limit info
    const rateLimit = client.getCurrentRateLimit();
    console.log('✓ Rate limit info accessible:', rateLimit === null ? 'No rate limit info yet' : 'Rate limit available');
  } catch (error) {
    console.error('✗ Failed to create GitHub client:', error);
    return;
  }

  console.log('✓ All GitHub integration components initialized successfully');
}

// Run test if this file is executed directly
if (require.main === module) {
  testGitHubIntegration().catch(console.error);
}

export { testGitHubIntegration };