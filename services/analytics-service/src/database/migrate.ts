/**
 * Database migration runner for GitHub integration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './connection';
import { logger } from '../telemetry/logger';

export class MigrationRunner {
  /**
   * Run GitHub integration migration
   */
  public static async runGitHubMigration(): Promise<boolean> {
    try {
      logger.info('Starting GitHub integration database migration...');

      // Read the migration SQL file
      const migrationPath = join(__dirname, 'github-migration.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      // Execute the migration in a transaction
      await db.transaction(async (client) => {
        // Split the SQL into individual statements
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
      });

      logger.info('GitHub integration database migration completed successfully');
      return true;
    } catch (error) {
      logger.error('GitHub integration database migration failed:', error);
      return false;
    }
  }

  /**
   * Check if GitHub tables exist
   */
  public static async checkGitHubTables(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('github_tokens', 'monitored_repositories', 'student_github_profiles', 'student_pr_submissions')
      `);

      const expectedTables = ['github_tokens', 'monitored_repositories', 'student_github_profiles', 'student_pr_submissions'];
      const existingTables = result.rows.map((row: any) => row.table_name);
      
      return expectedTables.every(table => existingTables.includes(table));
    } catch (error) {
      logger.error('Failed to check GitHub tables:', error);
      return false;
    }
  }

  /**
   * Initialize GitHub integration database schema
   */
  public static async initializeGitHubSchema(): Promise<boolean> {
    try {
      // Check if tables already exist
      const tablesExist = await this.checkGitHubTables();
      
      if (tablesExist) {
        logger.info('GitHub integration tables already exist');
        return true;
      }

      // Run migration
      return await this.runGitHubMigration();
    } catch (error) {
      logger.error('Failed to initialize GitHub schema:', error);
      return false;
    }
  }
}