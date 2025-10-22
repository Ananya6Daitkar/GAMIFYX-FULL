import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/telemetry/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aiops_secrets',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Starting secrets manager database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001-create-secrets-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Secrets manager database migration completed successfully!');
    
    // Verify the migration by checking if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'secret_access_logs', 
        'rotation_jobs', 
        'secret_usage', 
        'cicd_access_logs', 
        'notification_logs', 
        'security_alerts'
      )
    `;
    
    const result = await client.query(tablesQuery);
    console.log('📋 Created tables:', result.rows.map(row => row.table_name));
    
    // Check if views were created
    const viewsQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'secret_access_summary', 
        'rotation_job_summary', 
        'security_alert_summary'
      )
    `;
    
    const viewsResult = await client.query(viewsQuery);
    console.log('👁️  Created views:', viewsResult.rows.map(row => row.table_name));
    
    // Insert some initial test data
    console.log('\n📝 Inserting initial test data...');
    
    const testDataQueries = [
      `INSERT INTO secret_usage (secret_path, service, environment, access_count) VALUES
       ('database/production/main', 'user-service', 'production', 0),
       ('api-keys/github', 'ci-cd', 'production', 0),
       ('jwt/signing-key', 'auth-service', 'production', 0)
       ON CONFLICT (secret_path, service, environment) DO NOTHING`,
      
      `INSERT INTO cicd_access_logs (pipeline_id, platform, environment, service, secrets_requested, secrets_provided, ip_address, user_agent) VALUES
       ('github-actions-123', 'github-actions', 'production', 'user-service', 3, 3, '192.30.252.1', 'GitHub-Actions/1.0'),
       ('gitlab-ci-456', 'gitlab-ci', 'staging', 'auth-service', 2, 2, '35.231.145.151', 'GitLab-CI/1.0')`,
    ];
    
    for (const query of testDataQueries) {
      await client.query(query);
    }
    
    console.log('✅ Test data inserted successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Database migration script completed successfully');
      console.log('\n📋 Summary:');
      console.log('   • All secrets manager tables created');
      console.log('   • Indexes and triggers configured');
      console.log('   • Views for common queries created');
      console.log('   • Initial test data inserted');
      console.log('\n🔗 Next steps:');
      console.log('   1. Initialize Vault: npm run vault:init');
      console.log('   2. Start the service: npm run dev');
      console.log('   3. Test the API endpoints');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database migration script failed:', error);
      process.exit(1);
    });
}

export { runMigration };