# GitHub Integration Setup

This document explains how to set up GitHub integration for the AIOps Learning Platform using Ananya6Daitkar's GitHub account.

## Prerequisites

1. GitHub Personal Access Token
2. Repository access permissions
3. Webhook configuration (optional)

## Setup Steps

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read user profile data)
   - `user:email` (Access user email addresses)
   - `read:org` (Read org and team membership)

4. Copy the generated token

### 2. Configure Environment Variables

Update your `.env` file with the following:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_personal_access_token_here
GITHUB_USERNAME=Ananya6Daitkar
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Example Repositories

The system is configured to work with these example repositories:

- **Docker Assignment**: `https://github.com/Ananya6Daitkar/docker-assignment`
- **Kubernetes Deployment**: `https://github.com/Ananya6Daitkar/k8s-deployment`
- **CI/CD Pipeline**: `https://github.com/Ananya6Daitkar/cicd-pipeline`
- **General AIOps Project**: `https://github.com/Ananya6Daitkar/aiops-project`

### 4. Webhook Setup (Optional)

To receive real-time updates from GitHub:

1. Go to your repository → Settings → Webhooks
2. Click "Add webhook"
3. Set Payload URL to: `https://your-domain.com/submissions/webhook/github`
4. Set Content type to: `application/json`
5. Set Secret to your `GITHUB_WEBHOOK_SECRET`
6. Select events: `Pull requests`, `Pushes`

### 5. Testing the Integration

You can test the GitHub integration by:

1. Creating a submission with a repository URL
2. The system will automatically:
   - Clone the repository
   - Analyze the code
   - Calculate metrics (lines of code, complexity, etc.)
   - Generate feedback

### 6. Supported Features

- **Repository Analysis**: Automatic code analysis and metrics calculation
- **Language Detection**: Supports JavaScript, TypeScript, Python, Java, C++, and more
- **Complexity Scoring**: Calculates code complexity based on language and structure
- **Webhook Integration**: Real-time updates on pull requests and pushes
- **Commit-specific Analysis**: Can analyze specific commits or branches

## API Usage Examples

### Create Submission with GitHub Repository

```bash
curl -X POST http://localhost:3002/submissions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "title": "Docker Containerization Assignment",
    "description": "Containerize a Node.js application",
    "submissionType": "assignment",
    "repositoryUrl": "https://github.com/Ananya6Daitkar/docker-assignment",
    "commitHash": "main"
  }'
```

### Get Repository Analysis

The system will automatically:
1. Clone the repository
2. Detect programming languages
3. Count lines of code
4. Calculate complexity score
5. Run security analysis
6. Generate improvement suggestions

## Troubleshooting

### Common Issues

1. **Invalid Token**: Ensure your GitHub token has the correct permissions
2. **Repository Not Found**: Check that the repository exists and is accessible
3. **Rate Limiting**: GitHub API has rate limits; the system handles this automatically
4. **Webhook Failures**: Check that your webhook URL is accessible and the secret matches

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will show detailed information about GitHub API calls and repository processing.

## Security Notes

- Never commit your GitHub token to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your GitHub tokens
- Monitor webhook endpoints for security
- Validate all webhook signatures

## Support

If you encounter issues with the GitHub integration:

1. Check the service logs for error messages
2. Verify your GitHub token permissions
3. Test repository access manually
4. Check webhook configuration if using real-time updates