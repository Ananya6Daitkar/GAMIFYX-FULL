import { VaultService } from '@/services/VaultService';
import { SecretType, RotationStrategy } from '@/models/Secret';
import { logger } from '@/telemetry/logger';

async function initializeVault() {
  try {
    console.log('🔐 Initializing HashiCorp Vault for AIOps Learning Platform...\n');

    const vaultService = new VaultService();
    
    // Initialize Vault connection and engines
    await vaultService.initialize();
    console.log('✅ Vault connection established and engines configured\n');

    // Create sample secrets for demonstration
    console.log('📝 Creating sample secrets...');

    const sampleSecrets = [
      {
        name: 'database-main-password',
        path: 'database/production/main',
        type: SecretType.DATABASE_PASSWORD,
        value: 'SuperSecureDbPassword123!',
        metadata: {
          description: 'Main production database password',
          owner: 'admin@aiops-platform.com',
          environment: 'production',
          service: 'user-service',
          tags: ['database', 'production', 'critical'],
          sensitive: true
        },
        rotationConfig: {
          enabled: true,
          intervalDays: 90,
          strategy: RotationStrategy.DATABASE_ROTATE,
          notifyBefore: 7,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      },
      {
        name: 'github-api-key',
        path: 'api-keys/github',
        type: SecretType.API_KEY,
        value: 'ghp_1234567890abcdef1234567890abcdef12345678',
        metadata: {
          description: 'GitHub API key for CI/CD integration',
          owner: 'devops@aiops-platform.com',
          environment: 'production',
          service: 'ci-cd',
          tags: ['api-key', 'github', 'cicd', 'deployment'],
          sensitive: true
        },
        rotationConfig: {
          enabled: true,
          intervalDays: 60,
          strategy: RotationStrategy.API_REFRESH,
          notifyBefore: 5,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      },
      {
        name: 'jwt-signing-key',
        path: 'jwt/signing-key',
        type: SecretType.JWT_SECRET,
        value: 'super-secret-jwt-signing-key-that-should-be-very-long-and-random-123456789',
        metadata: {
          description: 'JWT signing key for authentication service',
          owner: 'security@aiops-platform.com',
          environment: 'production',
          service: 'auth-service',
          tags: ['jwt', 'authentication', 'security'],
          sensitive: true
        },
        rotationConfig: {
          enabled: true,
          intervalDays: 30,
          strategy: RotationStrategy.REGENERATE,
          notifyBefore: 3,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      },
      {
        name: 'encryption-key',
        path: 'encryption/aes-key',
        type: SecretType.ENCRYPTION_KEY,
        value: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        metadata: {
          description: 'AES encryption key for sensitive data',
          owner: 'security@aiops-platform.com',
          environment: 'production',
          service: 'data-service',
          tags: ['encryption', 'aes', 'security'],
          sensitive: true
        },
        rotationConfig: {
          enabled: true,
          intervalDays: 180,
          strategy: RotationStrategy.REGENERATE,
          notifyBefore: 14,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      },
      {
        name: 'webhook-secret',
        path: 'webhooks/github-secret',
        type: SecretType.WEBHOOK_SECRET,
        value: 'webhook-secret-for-github-integration-12345',
        metadata: {
          description: 'GitHub webhook secret for secure payload verification',
          owner: 'devops@aiops-platform.com',
          environment: 'production',
          service: 'webhook-handler',
          tags: ['webhook', 'github', 'cicd'],
          sensitive: true
        },
        rotationConfig: {
          enabled: true,
          intervalDays: 90,
          strategy: RotationStrategy.REGENERATE,
          notifyBefore: 7,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      }
    ];

    for (const secretData of sampleSecrets) {
      try {
        await vaultService.createSecret(secretData);
        console.log(`   ✅ Created secret: ${secretData.path}`);
      } catch (error) {
        console.log(`   ⚠️  Secret ${secretData.path} may already exist`);
      }
    }

    console.log('\n🔄 Setting up database connections for dynamic credentials...');
    
    // Configure database connection for dynamic credentials
    try {
      await vaultService.createDatabaseConnection('postgres-main', {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'aiops_learning_platform',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true'
      });
      console.log('   ✅ Database connection configured for dynamic credentials');
    } catch (error) {
      console.log('   ⚠️  Database connection may already be configured');
    }

    console.log('\n🎉 Vault initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${sampleSecrets.length} sample secrets created`);
    console.log('   • KV secrets engine enabled');
    console.log('   • Database secrets engine configured');
    console.log('   • Dynamic credentials ready');
    console.log('   • Rotation policies configured');

    console.log('\n🔗 Next steps:');
    console.log('   1. Start the secrets manager service: npm run dev');
    console.log('   2. Test secret retrieval via API');
    console.log('   3. Configure CI/CD integration');
    console.log('   4. Set up monitoring and alerting');

    console.log('\n🛡️  Security reminders:');
    console.log('   • Change default Vault token in production');
    console.log('   • Enable Vault audit logging');
    console.log('   • Configure proper network security');
    console.log('   • Set up backup and disaster recovery');

  } catch (error) {
    console.error('❌ Failed to initialize Vault:', error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeVault()
    .then(() => {
      console.log('\n✨ Vault initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Vault initialization script failed:', error);
      process.exit(1);
    });
}

export { initializeVault };