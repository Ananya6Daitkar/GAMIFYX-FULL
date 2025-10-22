import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@/telemetry/logger';
import db from './connection';

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

export class DatabaseMigrator {
  constructor(private db: Pool = db) {}

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    try {
      // Ensure migrations table exists
      await this.createMigrationsTable();

      // Get all migration files
      const migrations = await this.loadMigrations();
      
      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      
      // Filter pending migrations
      const pendingMigrations = migrations.filter(
        migration => !appliedMigrations.includes(migration.name)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Running ${pendingMigrations.length} pending migrations`);

      // Run each pending migration
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      logger.info('All migrations completed successfully');

    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      if (appliedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = appliedMigrations[appliedMigrations.length - 1];
      
      // Note: This is a simple implementation
      // In production, you'd want proper rollback scripts
      logger.warn(`Rollback not implemented for migration: ${lastMigration}`);
      
    } catch (error) {
      logger.error('Rollback failed', { error });
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async status(): Promise<{
    applied: string[];
    pending: string[];
    total: number;
  }> {
    try {
      await this.createMigrationsTable();
      
      const migrations = await this.loadMigrations();
      const appliedMigrations = await this.getAppliedMigrations();
      
      const pendingMigrations = migrations
        .filter(migration => !appliedMigrations.includes(migration.name))
        .map(migration => migration.name);

      return {
        applied: appliedMigrations,
        pending: pendingMigrations,
        total: migrations.length
      };

    } catch (error) {
      logger.error('Failed to get migration status', { error });
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await this.db.query(sql);
  }

  private async loadMigrations(): Promise<Migration[]> {
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf8');
      
      // Extract migration number from filename (e.g., 001_create_table.sql -> 1)
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        logger.warn(`Skipping invalid migration file: ${file}`);
        continue;
      }

      const id = parseInt(match[1], 10);
      const name = match[2];

      migrations.push({
        id,
        name: file,
        filename: file,
        sql
      });
    }

    return migrations.sort((a, b) => a.id - b.id);
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.db.query(`
      SELECT name FROM schema_migrations ORDER BY applied_at
    `);

    return result.rows.map(row => row.name);
  }

  private async runMigration(migration: Migration): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      logger.info(`Running migration: ${migration.name}`);

      // Execute migration SQL
      await client.query(migration.sql);

      // Record migration as applied
      await client.query(`
        INSERT INTO schema_migrations (name) VALUES ($1)
      `, [migration.name]);

      await client.query('COMMIT');

      logger.info(`Migration completed: ${migration.name}`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration failed: ${migration.name}`, { error });
      throw error;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const migrator = new DatabaseMigrator();

// CLI interface for running migrations
if (require.main === module) {
  const command = process.argv[2];

  async function runCommand() {
    try {
      switch (command) {
        case 'migrate':
          await migrator.migrate();
          break;
        case 'rollback':
          await migrator.rollback();
          break;
        case 'status':
          const status = await migrator.status();
          console.log('Migration Status:');
          console.log(`Applied: ${status.applied.length}`);
          console.log(`Pending: ${status.pending.length}`);
          console.log(`Total: ${status.total}`);
          if (status.pending.length > 0) {
            console.log('\nPending migrations:');
            status.pending.forEach(name => console.log(`  - ${name}`));
          }
          break;
        default:
          console.log('Usage: npm run migrate [migrate|rollback|status]');
          process.exit(1);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Migration command failed:', error);
      process.exit(1);
    }
  }

  runCommand();
}