import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aiops_learning_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting IAM system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/003-add-mfa-and-permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('IAM system migration completed successfully!');
    
    // Verify the migration by checking if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('roles', 'user_roles', 'access_audit_logs', 'permission_review_tasks')
    `;
    
    const result = await client.query(tablesQuery);
    console.log('Created tables:', result.rows.map(row => row.table_name));
    
    // Check if MFA columns were added to users table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('mfa_enabled', 'mfa_secret', 'backup_codes', 'failed_login_attempts', 'locked_until')
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('Added MFA columns:', columnsResult.rows.map(row => row.column_name));
    
    // Check if default roles were created
    const rolesQuery = 'SELECT name FROM roles';
    const rolesResult = await client.query(rolesQuery);
    console.log('Default roles created:', rolesResult.rows.map(row => row.name));
    
  } catch (error) {
    console.error('Migration failed:', error);
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
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigration };