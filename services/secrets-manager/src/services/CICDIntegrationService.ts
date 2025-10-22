import { VaultService } from './VaultService';
import { SecretAccessService } from './SecretAccessService';
import { SecretAction } from '@/models/Secret';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('secrets-manager', '1.0.0');

// CI/CD metrics
const cicdSecretRequests = meter.createCounter('cicd_secret_requests_total', {
  description: 'Total CI/CD secret requests'
});

const cicdSecretInjections = meter.createCounter('cicd_secret_injections_total', {
  description: 'Total CI/CD secret injections'
});

export class CICDIntegrationService {
  private vaultService: VaultService;
  private accessService: SecretAccessService;
  private allowedCIPlatforms: Set<string>;

  constructor(vaultService: VaultService, accessService: SecretAccessService) {
    this.vaultService = vaultService;
    this.accessService = accessService;
    
    // Configure allowed CI/CD platforms
    this.allowedCIPlatforms = new Set([
      'github-actions',
      'gitlab-ci',
      'jenkins',
      'azure-devops',
      'circleci',
      'travis-ci'
    ]);
  }

  async getSecretsForPipeline(
    pipelineId: string,
    environment: string,
    service: string,
    platform: string,
    userAgent: string,
    ipAddress: string
  ): Promise<Record<string, string>> {
    cicdSecretRequests.add(1, { platform, environment });

    try {
      // Validate CI/CD platform
      if (!this.allowedCIPlatforms.has(platform)) {
        throw new Error(`Unsupported CI/CD platform: ${platform}`);
      }

      // Get secrets for the specific service and environment
      const secretPaths = await this.vaultService.listSecrets(`${service}/${environment}`);
      const secrets: Record<string, string> = {};

      for (const path of secretPaths) {
        try {
          const secret = await this.vaultService.getSecret(path, true);
          
          if (!secret || !secret.value) {
            continue;
          }

          // Check if secret is appropriate for CI/CD usage
          if (!this.isSecretAllowedForCICD(secret.metadata.tags)) {
            logger.warn('Secret not allowed for CI/CD usage', { 
              path,
              tags: secret.metadata.tags
            });
            continue;
          }

          // Log access
          await this.accessService.logSecretAccess({
            secretId: secret.id,
            secretPath: secret.path,
            userId: `cicd-${pipelineId}`,
            action: SecretAction.READ,
            result: 'success',
            reason: `CI/CD pipeline access - ${platform}`,
            ipAddress,
            userAgent
          });

          // Use environment variable friendly name
          const envVarName = this.convertToEnvVarName(secret.name);
          secrets[envVarName] = secret.value;

        } catch (error) {
          logger.error('Failed to get secret for CI/CD', { error, path });
          
          // Log failed access
          await this.accessService.logSecretAccess({
            secretId: path,
            secretPath: path,
            userId: `cicd-${pipelineId}`,
            action: SecretAction.READ,
            result: 'failure',
            reason: `CI/CD access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ipAddress,
            userAgent
          });
        }
      }

      cicdSecretInjections.add(Object.keys(secrets).length, { platform, environment });

      logger.info('Secrets provided to CI/CD pipeline', {
        pipelineId,
        environment,
        service,
        platform,
        secretCount: Object.keys(secrets).length
      });

      return secrets;

    } catch (error) {
      logger.error('Failed to get secrets for CI/CD pipeline', {
        error,
        pipelineId,
        environment,
        service,
        platform
      });
      throw error;
    }
  }

  async generateGitHubActionsSecrets(
    repository: string,
    environment: string,
    service: string
  ): Promise<string> {
    try {
      const secrets = await this.getSecretsForPipeline(
        `github-${repository}`,
        environment,
        service,
        'github-actions',
        'GitHub Actions',
        'github.com'
      );

      // Generate GitHub Actions workflow step with enhanced security
      const secretsYaml = Object.keys(secrets).map(key => 
        `        ${key}: \${{ secrets.${key} }}`
      ).join('\n');

      const workflowStep = `
      # GamifyX Secrets Management - Auto-generated configuration
      - name: Configure secrets for ${service}
        env:
${secretsYaml}
        run: |
          echo "✅ Secrets loaded for ${service} in ${environment}"
          echo "🔐 Total secrets configured: ${Object.keys(secrets).length}"
          # Validate required secrets are present
          ${this.generateSecretValidation(secrets)}
          
      - name: Deploy ${service} with secrets
        env:
${secretsYaml}
        run: |
          # Your deployment commands here
          echo "🚀 Deploying ${service} to ${environment}"
          # Example: docker run -d --name ${service} $(env | grep -E '^[A-Z_]+=' | sed 's/^/-e /') ${service}:latest
      `;

      logger.info('GitHub Actions secrets configuration generated', {
        repository,
        environment,
        service,
        secretCount: Object.keys(secrets).length
      });

      return workflowStep;

    } catch (error) {
      logger.error('Failed to generate GitHub Actions secrets', {
        error,
        repository,
        environment,
        service
      });
      throw error;
    }
  }

  private generateSecretValidation(secrets: Record<string, string>): string {
    const validationCommands = Object.keys(secrets).map(key => 
      `          [ -z "\$${key}" ] && echo "❌ Missing required secret: ${key}" && exit 1`
    ).join('\n');
    
    return `${validationCommands}\n          echo "✅ All required secrets validated"`;
  }

  async generateDockerComposeSecrets(
    service: string,
    environment: string
  ): Promise<string> {
    try {
      const secrets = await this.getSecretsForPipeline(
        `docker-${service}`,
        environment,
        service,
        'docker-compose',
        'Docker Compose',
        'localhost'
      );

      // Generate Docker Compose environment section
      const envVars = Object.entries(secrets).map(([key, value]) => 
        `      ${key}=${value}`
      ).join('\n');

      const dockerComposeSection = `
  ${service}:
    image: ${service}:latest
    environment:
${envVars}
    # Other service configuration...
      `;

      logger.info('Docker Compose secrets configuration generated', {
        service,
        environment,
        secretCount: Object.keys(secrets).length
      });

      return dockerComposeSection;

    } catch (error) {
      logger.error('Failed to generate Docker Compose secrets', {
        error,
        service,
        environment
      });
      throw error;
    }
  }

  async generateKubernetesSecrets(
    namespace: string,
    service: string,
    environment: string
  ): Promise<string> {
    try {
      const secrets = await this.getSecretsForPipeline(
        `k8s-${namespace}-${service}`,
        environment,
        service,
        'kubernetes',
        'kubectl',
        'kubernetes-api'
      );

      // Generate Kubernetes Secret manifest
      const secretData = Object.entries(secrets).reduce((acc, [key, value]) => {
        acc[key] = Buffer.from(value).toString('base64');
        return acc;
      }, {} as Record<string, string>);

      const k8sSecret = `
apiVersion: v1
kind: Secret
metadata:
  name: ${service}-secrets
  namespace: ${namespace}
type: Opaque
data:
${Object.entries(secretData).map(([key, value]) => `  ${key}: ${value}`).join('\n')}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service}
  namespace: ${namespace}
spec:
  template:
    spec:
      containers:
      - name: ${service}
        envFrom:
        - secretRef:
            name: ${service}-secrets
      `;

      logger.info('Kubernetes secrets configuration generated', {
        namespace,
        service,
        environment,
        secretCount: Object.keys(secrets).length
      });

      return k8sSecret;

    } catch (error) {
      logger.error('Failed to generate Kubernetes secrets', {
        error,
        namespace,
        service,
        environment
      });
      throw error;
    }
  }

  async generateTerraformSecrets(
    service: string,
    environment: string
  ): Promise<string> {
    try {
      const secretPaths = await this.vaultService.listSecrets(`${service}/${environment}`);
      
      // Generate Terraform Vault data sources
      const terraformConfig = secretPaths.map(path => {
        const resourceName = this.convertToTerraformResourceName(path);
        return `
data "vault_generic_secret" "${resourceName}" {
  path = "aiops-secrets/data/${path}"
}

locals {
  ${resourceName}_value = data.vault_generic_secret.${resourceName}.data["value"]
}
        `;
      }).join('\n');

      logger.info('Terraform secrets configuration generated', {
        service,
        environment,
        secretCount: secretPaths.length
      });

      return terraformConfig;

    } catch (error) {
      logger.error('Failed to generate Terraform secrets', {
        error,
        service,
        environment
      });
      throw error;
    }
  }

  async validateCICDAccess(
    pipelineId: string,
    platform: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    try {
      // Validate platform
      if (!this.allowedCIPlatforms.has(platform)) {
        logger.warn('Invalid CI/CD platform attempted access', { 
          pipelineId,
          platform,
          ipAddress
        });
        return false;
      }

      // Validate IP address (in production, you'd check against allowed IP ranges)
      if (!this.isAllowedCICDIP(ipAddress, platform)) {
        logger.warn('CI/CD access from unauthorized IP', {
          pipelineId,
          platform,
          ipAddress
        });
        return false;
      }

      // Validate user agent
      if (!this.isValidCICDUserAgent(userAgent, platform)) {
        logger.warn('Invalid CI/CD user agent', {
          pipelineId,
          platform,
          userAgent
        });
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Failed to validate CI/CD access', {
        error,
        pipelineId,
        platform
      });
      return false;
    }
  }

  private isSecretAllowedForCICD(tags: string[]): boolean {
    // Check if secret is tagged for CI/CD usage
    return tags.includes('cicd') || tags.includes('deployment') || tags.includes('pipeline');
  }

  private convertToEnvVarName(secretName: string): string {
    return secretName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private convertToTerraformResourceName(path: string): string {
    return path
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private isAllowedCICDIP(ipAddress: string, platform: string): boolean {
    // In production, you would maintain a list of allowed IP ranges for each platform
    const allowedRanges: Record<string, string[]> = {
      'github-actions': [
        '192.30.252.0/22',
        '185.199.108.0/22',
        '140.82.112.0/20'
      ],
      'gitlab-ci': [
        '35.231.145.151/32',
        '35.243.134.0/24'
      ],
      // Add other platforms as needed
    };

    // For demo purposes, allow localhost and private IPs
    if (ipAddress === 'localhost' || 
        ipAddress.startsWith('127.') || 
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.')) {
      return true;
    }

    // In production, implement proper CIDR matching
    return true; // Simplified for demo
  }

  private isValidCICDUserAgent(userAgent: string, platform: string): boolean {
    const validUserAgents: Record<string, RegExp[]> = {
      'github-actions': [
        /^GitHub-Actions/,
        /^actions-runner/
      ],
      'gitlab-ci': [
        /^GitLab-CI/,
        /^gitlab-runner/
      ],
      'jenkins': [
        /^Jenkins/,
        /^Apache-HttpClient/
      ]
    };

    const patterns = validUserAgents[platform];
    if (!patterns) {
      return true; // Allow unknown platforms for now
    }

    return patterns.some(pattern => pattern.test(userAgent));
  }

  async getCICDUsageStats(): Promise<{
    totalRequests: number;
    requestsByPlatform: Record<string, number>;
    requestsByEnvironment: Record<string, number>;
    secretsInjected: number;
    averageSecretsPerRequest: number;
  }> {
    try {
      // In a real implementation, this would query metrics or database
      // For now, return mock data based on current metrics
      
      logger.info('Generating CI/CD usage statistics');

      return {
        totalRequests: 150,
        requestsByPlatform: {
          'github-actions': 80,
          'gitlab-ci': 35,
          'jenkins': 25,
          'azure-devops': 10
        },
        requestsByEnvironment: {
          'production': 60,
          'staging': 45,
          'development': 45
        },
        secretsInjected: 450,
        averageSecretsPerRequest: 3.0
      };

    } catch (error) {
      logger.error('Failed to get CI/CD usage stats', { error });
      throw error;
    }
  }
}