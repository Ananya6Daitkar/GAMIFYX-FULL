import { VaultService } from './VaultService';
import { SecretAccessService } from './SecretAccessService';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';
import * as fs from 'fs/promises';
import * as path from 'path';

const meter = metrics.getMeter('secrets-manager', '1.0.0');

// Secret injection metrics
const secretInjections = meter.createCounter('secret_injections_total', {
  description: 'Total secret injections performed'
});

const injectionFailures = meter.createCounter('secret_injection_failures_total', {
  description: 'Total secret injection failures'
});

const injectionDuration = meter.createHistogram('secret_injection_duration_seconds', {
  description: 'Time taken to inject secrets'
});

export interface SecretInjectionConfig {
  service: string;
  environment: string;
  format: 'env' | 'json' | 'yaml' | 'docker-compose' | 'kubernetes' | 'terraform';
  outputPath?: string;
  templatePath?: string;
  secretPaths: string[];
  transformations?: Record<string, (value: string) => string>;
}

export interface InjectionResult {
  success: boolean;
  secretsInjected: number;
  outputPath?: string;
  format: string;
  timestamp: Date;
  errors?: string[];
}

export class SecretInjectionService {
  private vaultService: VaultService;
  private accessService: SecretAccessService;

  constructor(vaultService: VaultService, accessService: SecretAccessService) {
    this.vaultService = vaultService;
    this.accessService = accessService;
  }

  async injectSecrets(config: SecretInjectionConfig, userId: string): Promise<InjectionResult> {
    const startTime = Date.now();
    secretInjections.add(1, { 
      service: config.service, 
      environment: config.environment, 
      format: config.format 
    });

    try {
      logger.info('Starting secret injection', {
        service: config.service,
        environment: config.environment,
        format: config.format,
        secretCount: config.secretPaths.length
      });

      // Retrieve all secrets
      const secrets: Record<string, string> = {};
      const errors: string[] = [];

      for (const secretPath of config.secretPaths) {
        try {
          const secret = await this.vaultService.getSecret(secretPath, true);
          
          if (!secret || !secret.value) {
            errors.push(`Secret not found or empty: ${secretPath}`);
            continue;
          }

          // Apply transformations if specified
          let secretValue = secret.value;
          if (config.transformations && config.transformations[secretPath]) {
            secretValue = config.transformations[secretPath](secretValue);
          }

          // Use environment variable friendly name
          const envVarName = this.convertToEnvVarName(secret.name);
          secrets[envVarName] = secretValue;

          // Log access
          await this.accessService.logSecretAccess({
            secretId: secret.id,
            secretPath: secret.path,
            userId,
            action: 'inject',
            result: 'success',
            reason: `Secret injection for ${config.service}/${config.environment}`,
            ipAddress: 'localhost',
            userAgent: 'secret-injection-service'
          });

        } catch (error) {
          const errorMsg = `Failed to retrieve secret ${secretPath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error('Secret retrieval failed during injection', { error, secretPath });
        }
      }

      if (Object.keys(secrets).length === 0) {
        throw new Error('No secrets were successfully retrieved for injection');
      }

      // Generate output based on format
      let output: string;
      let outputPath: string | undefined;

      switch (config.format) {
        case 'env':
          output = this.generateEnvFormat(secrets);
          outputPath = config.outputPath || `.env.${config.environment}`;
          break;
        case 'json':
          output = this.generateJsonFormat(secrets);
          outputPath = config.outputPath || `secrets.${config.environment}.json`;
          break;
        case 'yaml':
          output = this.generateYamlFormat(secrets);
          outputPath = config.outputPath || `secrets.${config.environment}.yaml`;
          break;
        case 'docker-compose':
          output = this.generateDockerComposeFormat(secrets, config.service);
          outputPath = config.outputPath || `docker-compose.${config.environment}.yml`;
          break;
        case 'kubernetes':
          output = this.generateKubernetesFormat(secrets, config.service, config.environment);
          outputPath = config.outputPath || `${config.service}-secrets.yaml`;
          break;
        case 'terraform':
          output = this.generateTerraformFormat(secrets, config.service);
          outputPath = config.outputPath || `secrets.${config.environment}.tf`;
          break;
        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      // Write output to file if path specified
      if (outputPath) {
        await this.writeSecureFile(outputPath, output);
      }

      const duration = (Date.now() - startTime) / 1000;
      injectionDuration.record(duration);

      const result: InjectionResult = {
        success: true,
        secretsInjected: Object.keys(secrets).length,
        outputPath,
        format: config.format,
        timestamp: new Date(),
        errors: errors.length > 0 ? errors : undefined
      };

      logger.info('Secret injection completed successfully', {
        service: config.service,
        environment: config.environment,
        secretsInjected: result.secretsInjected,
        outputPath,
        duration
      });

      return result;

    } catch (error) {
      injectionFailures.add(1, { 
        service: config.service, 
        environment: config.environment, 
        format: config.format 
      });

      logger.error('Secret injection failed', {
        error,
        service: config.service,
        environment: config.environment
      });

      return {
        success: false,
        secretsInjected: 0,
        format: config.format,
        timestamp: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async injectSecretsForAllServices(environment: string, userId: string): Promise<InjectionResult[]> {
    const services = [
      'user-service',
      'submission-service',
      'gamification-service',
      'analytics-service',
      'ai-feedback-service',
      'feedback-service',
      'integration-service',
      'api-gateway',
      'frontend'
    ];

    const results: InjectionResult[] = [];

    for (const service of services) {
      try {
        // Get service-specific secrets
        const secretPaths = await this.getServiceSecretPaths(service, environment);
        
        if (secretPaths.length === 0) {
          logger.info(`No secrets found for service ${service} in ${environment}`);
          continue;
        }

        const config: SecretInjectionConfig = {
          service,
          environment,
          format: 'env',
          outputPath: `./services/${service}/.env.${environment}`,
          secretPaths
        };

        const result = await this.injectSecrets(config, userId);
        results.push(result);

      } catch (error) {
        logger.error(`Failed to inject secrets for service ${service}`, { error });
        results.push({
          success: false,
          secretsInjected: 0,
          format: 'env',
          timestamp: new Date(),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    return results;
  }

  private async getServiceSecretPaths(service: string, environment: string): Promise<string[]> {
    try {
      // List secrets for the service/environment combination
      const secretPaths = await this.vaultService.listSecrets(`${service}/${environment}`);
      
      // Also include common secrets
      const commonPaths = await this.vaultService.listSecrets(`common/${environment}`);
      
      return [...secretPaths, ...commonPaths];
    } catch (error) {
      logger.error('Failed to get service secret paths', { error, service, environment });
      return [];
    }
  }

  private generateEnvFormat(secrets: Record<string, string>): string {
    const header = `# Auto-generated secrets file - DO NOT EDIT MANUALLY\n# Generated at: ${new Date().toISOString()}\n\n`;
    const envVars = Object.entries(secrets)
      .map(([key, value]) => `${key}=${this.escapeEnvValue(value)}`)
      .join('\n');
    
    return header + envVars + '\n';
  }

  private generateJsonFormat(secrets: Record<string, string>): string {
    return JSON.stringify({
      _metadata: {
        generated: new Date().toISOString(),
        warning: 'Auto-generated secrets file - DO NOT EDIT MANUALLY'
      },
      secrets
    }, null, 2);
  }

  private generateYamlFormat(secrets: Record<string, string>): string {
    const header = `# Auto-generated secrets file - DO NOT EDIT MANUALLY\n# Generated at: ${new Date().toISOString()}\n\n`;
    const yamlContent = Object.entries(secrets)
      .map(([key, value]) => `${key}: "${this.escapeYamlValue(value)}"`)
      .join('\n');
    
    return header + 'secrets:\n' + yamlContent.split('\n').map(line => `  ${line}`).join('\n') + '\n';
  }

  private generateDockerComposeFormat(secrets: Record<string, string>, service: string): string {
    const envVars = Object.entries(secrets)
      .map(([key, value]) => `      ${key}=${this.escapeEnvValue(value)}`)
      .join('\n');

    return `# Auto-generated Docker Compose secrets - DO NOT EDIT MANUALLY
# Generated at: ${new Date().toISOString()}

version: '3.8'

services:
  ${service}:
    environment:
${envVars}
`;
  }

  private generateKubernetesFormat(secrets: Record<string, string>, service: string, environment: string): string {
    const secretData = Object.entries(secrets).reduce((acc, [key, value]) => {
      acc[key] = Buffer.from(value).toString('base64');
      return acc;
    }, {} as Record<string, string>);

    const dataEntries = Object.entries(secretData)
      .map(([key, value]) => `  ${key}: ${value}`)
      .join('\n');

    return `# Auto-generated Kubernetes Secret - DO NOT EDIT MANUALLY
# Generated at: ${new Date().toISOString()}

apiVersion: v1
kind: Secret
metadata:
  name: ${service}-secrets
  namespace: ${environment}
  labels:
    app: ${service}
    environment: ${environment}
    managed-by: gamifyx-secrets-manager
type: Opaque
data:
${dataEntries}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service}
  namespace: ${environment}
spec:
  template:
    spec:
      containers:
      - name: ${service}
        envFrom:
        - secretRef:
            name: ${service}-secrets
`;
  }

  private generateTerraformFormat(secrets: Record<string, string>, service: string): string {
    const secretResources = Object.entries(secrets)
      .map(([key, value]) => {
        const resourceName = this.convertToTerraformResourceName(`${service}_${key}`);
        return `
resource "vault_generic_secret" "${resourceName}" {
  path = "aiops-secrets/data/${service}/${key.toLowerCase()}"
  
  data_json = jsonencode({
    value = "${this.escapeTerraformValue(value)}"
  })
}

output "${resourceName}_value" {
  value = vault_generic_secret.${resourceName}.data["value"]
  sensitive = true
}`;
      }).join('\n');

    return `# Auto-generated Terraform secrets - DO NOT EDIT MANUALLY
# Generated at: ${new Date().toISOString()}

terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.0"
    }
  }
}
${secretResources}
`;
  }

  private async writeSecureFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write file with restricted permissions (600 - owner read/write only)
      await fs.writeFile(filePath, content, { mode: 0o600 });

      logger.info('Secure file written successfully', { filePath });
    } catch (error) {
      logger.error('Failed to write secure file', { error, filePath });
      throw error;
    }
  }

  private convertToEnvVarName(secretName: string): string {
    return secretName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private convertToTerraformResourceName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private escapeEnvValue(value: string): string {
    // Escape special characters for shell environment variables
    if (value.includes(' ') || value.includes('"') || value.includes('$') || value.includes('`')) {
      return `"${value.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}"`;
    }
    return value;
  }

  private escapeYamlValue(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  private escapeTerraformValue(value: string): string {
    return value.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  }

  async getInjectionHistory(service?: string, environment?: string): Promise<Array<{
    service: string;
    environment: string;
    timestamp: Date;
    secretsInjected: number;
    format: string;
    success: boolean;
  }>> {
    // In a real implementation, this would query a database
    // For now, return mock data
    return [
      {
        service: service || 'user-service',
        environment: environment || 'production',
        timestamp: new Date(),
        secretsInjected: 5,
        format: 'env',
        success: true
      }
    ];
  }

  async validateSecretInjection(filePath: string): Promise<{
    valid: boolean;
    secretsFound: number;
    missingSecrets: string[];
    errors: string[];
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      const secretsFound = lines.filter(line => line.includes('=')).length;
      const missingSecrets: string[] = [];
      const errors: string[] = [];

      // Basic validation - check for common required secrets
      const requiredSecrets = ['JWT_SECRET', 'DB_PASSWORD', 'REDIS_HOST'];
      for (const required of requiredSecrets) {
        if (!content.includes(required)) {
          missingSecrets.push(required);
        }
      }

      return {
        valid: missingSecrets.length === 0 && errors.length === 0,
        secretsFound,
        missingSecrets,
        errors
      };

    } catch (error) {
      return {
        valid: false,
        secretsFound: 0,
        missingSecrets: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}