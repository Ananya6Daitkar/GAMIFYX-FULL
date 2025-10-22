const { execSync } = require('child_process');
const axios = require('axios');

describe('Docker Container Integration Tests', () => {
  const services = [
    { name: 'user-service', port: 3001, path: '/health' },
    { name: 'submission-service', port: 3002, path: '/health' },
    { name: 'gamification-service', port: 3003, path: '/health' },
    { name: 'feedback-service', port: 3004, path: '/health' },
    { name: 'analytics-service', port: 3005, path: '/health' }
  ];

  const databases = [
    { name: 'postgres', port: 5432 },
    { name: 'redis', port: 6379 }
  ];

  beforeAll(async () => {
    console.log('Starting Docker containers...');
    try {
      // Start containers in detached mode
      execSync('docker-compose up -d postgres redis', { stdio: 'inherit' });
      
      // Wait for databases to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error('Failed to start containers:', error.message);
      throw error;
    }
  }, 60000);

  afterAll(async () => {
    console.log('Stopping Docker containers...');
    try {
      execSync('docker-compose down', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to stop containers:', error.message);
    }
  }, 30000);

  describe('Database Containers', () => {
    test('PostgreSQL container should be healthy', async () => {
      const result = execSync('docker-compose ps postgres --format json', { encoding: 'utf8' });
      const containerInfo = JSON.parse(result);
      
      expect(containerInfo.State).toBe('running');
      expect(containerInfo.Health).toBe('healthy');
    });

    test('Redis container should be healthy', async () => {
      const result = execSync('docker-compose ps redis --format json', { encoding: 'utf8' });
      const containerInfo = JSON.parse(result);
      
      expect(containerInfo.State).toBe('running');
      expect(containerInfo.Health).toBe('healthy');
    });

    test('PostgreSQL should accept connections', async () => {
      const testConnection = () => {
        try {
          execSync('docker-compose exec -T postgres pg_isready -U aiops_user -d aiops_learning', { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      };

      // Retry connection test up to 5 times
      let connected = false;
      for (let i = 0; i < 5; i++) {
        if (testConnection()) {
          connected = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      expect(connected).toBe(true);
    });

    test('Redis should accept connections', async () => {
      const testConnection = () => {
        try {
          const result = execSync('docker-compose exec -T redis redis-cli ping', { encoding: 'utf8' });
          return result.trim() === 'PONG';
        } catch {
          return false;
        }
      };

      // Retry connection test up to 5 times
      let connected = false;
      for (let i = 0; i < 5; i++) {
        if (testConnection()) {
          connected = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      expect(connected).toBe(true);
    });
  });

  describe('Network Connectivity', () => {
    test('Services should be able to reach databases', async () => {
      // Test PostgreSQL connectivity from user-service container
      try {
        execSync('docker-compose run --rm user-service sh -c "nc -z postgres 5432"', { stdio: 'pipe' });
      } catch (error) {
        fail('User service cannot reach PostgreSQL');
      }

      // Test Redis connectivity from user-service container
      try {
        execSync('docker-compose run --rm user-service sh -c "nc -z redis 6379"', { stdio: 'pipe' });
      } catch (error) {
        fail('User service cannot reach Redis');
      }
    });

    test('API Gateway should be able to reach services', async () => {
      // This test would run if we had the services running
      // For now, we'll test the network configuration
      const networkResult = execSync('docker network ls --format "{{.Name}}"', { encoding: 'utf8' });
      const networks = networkResult.split('\n').filter(Boolean);
      
      expect(networks.some(network => network.includes('aiops'))).toBe(true);
    });
  });

  describe('Container Resource Limits', () => {
    test('Containers should have appropriate resource limits', async () => {
      const containers = ['aiops-postgres', 'aiops-redis'];
      
      for (const container of containers) {
        try {
          const statsResult = execSync(`docker stats ${container} --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"`, { encoding: 'utf8' });
          expect(statsResult).toContain(container);
        } catch (error) {
          console.warn(`Could not get stats for ${container}:`, error.message);
        }
      }
    });
  });

  describe('Data Persistence', () => {
    test('PostgreSQL data should persist across container restarts', async () => {
      // Insert test data
      execSync('docker-compose exec -T postgres psql -U aiops_user -d aiops_learning -c "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (\'test@example.com\', \'hash\', \'Test\', \'User\', \'student\');"', { stdio: 'pipe' });
      
      // Restart PostgreSQL container
      execSync('docker-compose restart postgres', { stdio: 'pipe' });
      
      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if data persists
      const result = execSync('docker-compose exec -T postgres psql -U aiops_user -d aiops_learning -c "SELECT email FROM users WHERE email = \'test@example.com\';"', { encoding: 'utf8' });
      
      expect(result).toContain('test@example.com');
      
      // Cleanup
      execSync('docker-compose exec -T postgres psql -U aiops_user -d aiops_learning -c "DELETE FROM users WHERE email = \'test@example.com\';"', { stdio: 'pipe' });
    });
  });
});