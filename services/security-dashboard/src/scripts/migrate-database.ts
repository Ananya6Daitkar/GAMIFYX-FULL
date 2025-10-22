import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/telemetry/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aiops_security',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🛡️  Starting security dashboard database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001-create-security-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Security dashboard database migration completed successfully!');
    
    // Verify the migration by checking if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'vulnerabilities', 
        'threat_intelligence', 
        'security_incidents', 
        'security_alerts', 
        'security_benchmarks',
        'security_training',
        'phishing_tests',
        'security_events',
        'threat_blocks',
        'security_reports'
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
        'vulnerability_summary', 
        'threat_summary', 
        'incident_summary',
        'compliance_summary',
        'training_summary'
      )
    `;
    
    const viewsResult = await client.query(viewsQuery);
    console.log('👁️  Created views:', viewsResult.rows.map(row => row.table_name));
    
    // Check sample data
    const benchmarksQuery = 'SELECT COUNT(*) as count FROM security_benchmarks';
    const benchmarksResult = await client.query(benchmarksQuery);
    console.log(`📊 Sample benchmarks inserted: ${benchmarksResult.rows[0].count}`);
    
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
      console.log('\n🎉 Security dashboard database migration completed successfully');
      console.log('\n📋 Summary:');
      console.log('   • All security dashboard tables created');
      console.log('   • Indexes and views configured');
      console.log('   • Sample compliance benchmarks inserted');
      console.log('   • Database ready for security monitoring');
      console.log('\n🔗 Next steps:');
      console.log('   1. Start the security dashboard service: npm run dev');
      console.log('   2. Configure threat intelligence feeds');
      console.log('   3. Set up vulnerability scanning');
      console.log('   4. Configure compliance frameworks');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Security dashboard database migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };