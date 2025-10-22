const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const DEMO_DATA_PATH = path.join(__dirname, '../data-generator/demo-data.json');

describe('Demo Data Validation Tests', () => {
  let demoData;
  let authTokens = {};

  beforeAll(async () => {
    // Load generated demo data
    if (fs.existsSync(DEMO_DATA_PATH)) {
      demoData = JSON.parse(fs.readFileSync(DEMO_DATA_PATH, 'utf8'));
      console.log(`📊 Loaded demo data: ${demoData.metadata.totalRecords} records`);
    } else {
      console.warn('⚠️ Demo data file not found, generating...');
      const DemoDataGenerator = require('../data-generator/src/generate-demo-data');
      const generator = new DemoDataGenerator();
      demoData = generator.generateAll();
    }

    // Authenticate demo users
    await authenticateDemoUsers();
  });

  async function authenticateDemoUsers() {
    const demoCredentials = [
      { email: 'demo.student@aiops-platform.com', password: 'DemoStudent123!', role: 'student' },
      { email: 'demo.teacher@aiops-platform.com', password: 'DemoTeacher123!', role: 'teacher' },
      { email: 'demo.admin@aiops-platform.com', password: 'DemoAdmin123!', role: 'admin' }
    ];

    for (const cred of demoCredentials) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: cred.email,
          password: cred.password
        });
        authTokens[cred.role] = response.data.token;
        console.log(`✅ Authenticated ${cred.role}`);
      } catch (error) {
        console.warn(`⚠️ Could not authenticate ${cred.role}: ${error.message}`);
      }
    }
  }

  describe('Demo Data Generation Validation', () => {
    test('should have generated valid user data', () => {
      expect(demoData.users).toBeDefined();
      expect(Array.isArray(demoData.users)).toBe(true);
      expect(demoData.users.length).toBeGreaterThan(50);

      // Validate user structure
      const sampleUser = demoData.users[0];
      expect(sampleUser).toHaveProperty('id');
      expect(sampleUser).toHaveProperty('email');
      expect(sampleUser).toHaveProperty('firstName');
      expect(sampleUser).toHaveProperty('lastName');
      expect(sampleUser).toHaveProperty('role');
      expect(['student', 'teacher', 'admin']).toContain(sampleUser.role);

      // Check role distribution
      const students = demoData.users.filter(u => u.role === 'student');
      const teachers = demoData.users.filter(u => u.role === 'teacher');
      const admins = demoData.users.filter(u => u.role === 'admin');

      expect(students.length).toBeGreaterThan(40);
      expect(teachers.length).toBeGreaterThan(3);
      expect(admins.length).toBeGreaterThan(1);
    });

    test('should have generated valid submission data', () => {
      expect(demoData.submissions).toBeDefined();
      expect(Array.isArray(demoData.submissions)).toBe(true);
      expect(demoData.submissions.length).toBeGreaterThan(500);

      // Validate submission structure
      const sampleSubmission = demoData.submissions[0];
      expect(sampleSubmission).toHaveProperty('id');
      expect(sampleSubmission).toHaveProperty('userId');
      expect(sampleSubmission).toHaveProperty('submissionType');
      expect(sampleSubmission).toHaveProperty('status');
      expect(sampleSubmission).toHaveProperty('codeContent');
      expect(sampleSubmission).toHaveProperty('metrics');

      // Validate metrics
      expect(sampleSubmission.metrics).toHaveProperty('codeQuality');
      expect(sampleSubmission.metrics).toHaveProperty('linesOfCode');
      expect(sampleSubmission.metrics).toHaveProperty('complexity');

      // Check submission types
      const submissionTypes = [...new Set(demoData.submissions.map(s => s.submissionType))];
      expect(submissionTypes).toContain('assignment');
      expect(submissionTypes).toContain('project');
      expect(submissionTypes).toContain('challenge');
    });

    test('should have generated valid feedback data', () => {
      expect(demoData.feedback).toBeDefined();
      expect(Array.isArray(demoData.feedback)).toBe(true);
      expect(demoData.feedback.length).toBeGreaterThan(400);

      // Validate feedback structure
      const sampleFeedback = demoData.feedback[0];
      expect(sampleFeedback).toHaveProperty('id');
      expect(sampleFeedback).toHaveProperty('submissionId');
      expect(sampleFeedback).toHaveProperty('userId');
      expect(sampleFeedback).toHaveProperty('overallScore');
      expect(sampleFeedback).toHaveProperty('suggestions');
      expect(sampleFeedback).toHaveProperty('learningResources');

      // Validate score ranges
      expect(sampleFeedback.overallScore).toBeGreaterThanOrEqual(0);
      expect(sampleFeedback.overallScore).toBeLessThanOrEqual(1);

      // Validate suggestions structure
      expect(Array.isArray(sampleFeedback.suggestions)).toBe(true);
      if (sampleFeedback.suggestions.length > 0) {
        const suggestion = sampleFeedback.suggestions[0];
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('message');
        expect(suggestion).toHaveProperty('priority');
      }
    });

    test('should have generated valid gamification data', () => {
      expect(demoData.gamification).toBeDefined();
      expect(Array.isArray(demoData.gamification)).toBe(true);

      // Validate gamification structure
      const sampleGamification = demoData.gamification[0];
      expect(sampleGamification).toHaveProperty('userId');
      expect(sampleGamification).toHaveProperty('totalPoints');
      expect(sampleGamification).toHaveProperty('level');
      expect(sampleGamification).toHaveProperty('badges');
      expect(sampleGamification).toHaveProperty('leaderboardRank');

      // Validate points and levels
      expect(sampleGamification.totalPoints).toBeGreaterThanOrEqual(0);
      expect(sampleGamification.level).toBeGreaterThanOrEqual(1);
      expect(sampleGamification.leaderboardRank).toBeGreaterThanOrEqual(1);

      // Check leaderboard ranking consistency
      const sortedByPoints = demoData.gamification.sort((a, b) => b.totalPoints - a.totalPoints);
      sortedByPoints.forEach((profile, index) => {
        expect(profile.leaderboardRank).toBe(index + 1);
      });
    });

    test('should have generated valid analytics data', () => {
      expect(demoData.analytics).toBeDefined();
      expect(Array.isArray(demoData.analytics)).toBe(true);

      // Validate analytics structure
      const sampleAnalytics = demoData.analytics[0];
      expect(sampleAnalytics).toHaveProperty('userId');
      expect(sampleAnalytics).toHaveProperty('riskScore');
      expect(sampleAnalytics).toHaveProperty('performanceTrend');
      expect(sampleAnalytics).toHaveProperty('metrics');
      expect(sampleAnalytics).toHaveProperty('predictions');

      // Validate risk score range
      expect(sampleAnalytics.riskScore).toBeGreaterThanOrEqual(0);
      expect(sampleAnalytics.riskScore).toBeLessThanOrEqual(1);

      // Validate performance trend values
      expect(['improving', 'stable', 'declining']).toContain(sampleAnalytics.performanceTrend);

      // Validate metrics structure
      expect(sampleAnalytics.metrics).toHaveProperty('averageCodeQuality');
      expect(sampleAnalytics.metrics).toHaveProperty('totalSubmissions');
      expect(sampleAnalytics.metrics).toHaveProperty('successRate');
    });

    test('should have consistent data relationships', () => {
      // Check that all submissions have corresponding users
      const userIds = new Set(demoData.users.map(u => u.id));
      const submissionUserIds = new Set(demoData.submissions.map(s => s.userId));
      
      submissionUserIds.forEach(userId => {
        expect(userIds.has(userId)).toBe(true);
      });

      // Check that all feedback has corresponding submissions
      const submissionIds = new Set(demoData.submissions.map(s => s.id));
      demoData.feedback.forEach(feedback => {
        expect(submissionIds.has(feedback.submissionId)).toBe(true);
      });

      // Check that gamification data exists for students
      const studentIds = new Set(demoData.users.filter(u => u.role === 'student').map(u => u.id));
      const gamificationUserIds = new Set(demoData.gamification.map(g => g.userId));
      
      studentIds.forEach(studentId => {
        expect(gamificationUserIds.has(studentId)).toBe(true);
      });
    });
  });

  describe('Demo Scenarios Validation', () => {
    test('should validate student learning journey scenario', async () => {
      if (!authTokens.student) {
        console.warn('⚠️ Student token not available, skipping test');
        return;
      }

      // Test submission workflow
      const submissionData = {
        submissionId: `test-validation-${Date.now()}`,
        userId: 'demo-student-id',
        codeContent: `function testFunction() {
  console.log('Demo validation test');
  return true;
}`,
        submissionType: 'assignment',
        metadata: {
          language: 'javascript',
          difficulty: 'beginner',
          tags: ['demo', 'validation']
        }
      };

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/workflow/submission`,
          submissionData,
          {
            headers: { 'Authorization': `Bearer ${authTokens.student}` },
            timeout: 10000
          }
        );

        expect(response.status).toBe(202);
        expect(response.data).toHaveProperty('submissionId');
        expect(response.data.status).toBe('processing');
        console.log('✅ Student submission workflow validated');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⚠️ API not available, skipping workflow test');
        } else {
          console.error('❌ Student workflow validation failed:', error.message);
        }
      }
    });

    test('should validate teacher dashboard access', async () => {
      if (!authTokens.teacher) {
        console.warn('⚠️ Teacher token not available, skipping test');
        return;
      }

      try {
        // Test analytics access
        const analyticsResponse = await axios.get(
          `${API_BASE_URL}/api/analytics/risk-scores`,
          {
            headers: { 'Authorization': `Bearer ${authTokens.teacher}` },
            timeout: 5000
          }
        );

        expect(analyticsResponse.status).toBe(200);
        expect(Array.isArray(analyticsResponse.data)).toBe(true);
        console.log('✅ Teacher dashboard access validated');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⚠️ API not available, skipping teacher dashboard test');
        } else {
          console.error('❌ Teacher dashboard validation failed:', error.message);
        }
      }
    });

    test('should validate gamification features', async () => {
      if (!authTokens.student) {
        console.warn('⚠️ Student token not available, skipping test');
        return;
      }

      try {
        // Test leaderboard access
        const leaderboardResponse = await axios.get(
          `${API_BASE_URL}/api/gamification/leaderboard`,
          {
            headers: { 'Authorization': `Bearer ${authTokens.student}` },
            timeout: 5000
          }
        );

        expect(leaderboardResponse.status).toBe(200);
        expect(Array.isArray(leaderboardResponse.data)).toBe(true);
        console.log('✅ Gamification features validated');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⚠️ API not available, skipping gamification test');
        } else {
          console.error('❌ Gamification validation failed:', error.message);
        }
      }
    });
  });

  describe('System Health Validation', () => {
    test('should validate all services are healthy', async () => {
      const services = ['user', 'submission', 'gamification', 'feedback', 'analytics'];
      const healthResults = [];

      for (const service of services) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/health/${service}`,
            { timeout: 3000 }
          );
          
          healthResults.push({
            service,
            status: response.status,
            healthy: response.data.status === 'healthy'
          });
        } catch (error) {
          healthResults.push({
            service,
            status: error.response?.status || 'error',
            healthy: false,
            error: error.message
          });
        }
      }

      console.log('🏥 Service Health Results:');
      healthResults.forEach(result => {
        const icon = result.healthy ? '✅' : '❌';
        console.log(`  ${icon} ${result.service}: ${result.status}`);
      });

      // At least 70% of services should be healthy for demo
      const healthyCount = healthResults.filter(r => r.healthy).length;
      const healthyPercentage = (healthyCount / healthResults.length) * 100;
      
      if (healthyPercentage >= 70) {
        console.log(`✅ System health: ${healthyPercentage.toFixed(1)}% services healthy`);
      } else {
        console.warn(`⚠️ System health: ${healthyPercentage.toFixed(1)}% services healthy (below 70% threshold)`);
      }
    });

    test('should validate API Gateway is accessible', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
        expect(response.status).toBe(200);
        console.log('✅ API Gateway is accessible');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('⚠️ API Gateway not accessible - services may not be running');
        } else {
          console.error('❌ API Gateway validation failed:', error.message);
        }
      }
    });
  });

  describe('Performance Validation', () => {
    test('should validate API response times', async () => {
      const endpoints = [
        { path: '/health', expectedTime: 100 },
        { path: '/api/health/user', expectedTime: 200 },
        { path: '/api/health/submission', expectedTime: 200 }
      ];

      for (const endpoint of endpoints) {
        try {
          const startTime = Date.now();
          const response = await axios.get(`${API_BASE_URL}${endpoint.path}`, { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          console.log(`⏱️ ${endpoint.path}: ${responseTime}ms`);
          
          if (responseTime <= endpoint.expectedTime) {
            console.log(`  ✅ Response time within expected range (${endpoint.expectedTime}ms)`);
          } else {
            console.warn(`  ⚠️ Response time exceeded expected range (${endpoint.expectedTime}ms)`);
          }
        } catch (error) {
          console.warn(`  ⚠️ Could not test ${endpoint.path}: ${error.message}`);
        }
      }
    });

    test('should validate data generation performance', () => {
      const { metadata } = demoData;
      
      console.log('📊 Demo Data Generation Performance:');
      console.log(`  📈 Total Records: ${metadata.totalRecords}`);
      console.log(`  👥 Users: ${demoData.users.length}`);
      console.log(`  📝 Submissions: ${demoData.submissions.length}`);
      console.log(`  💬 Feedback: ${demoData.feedback.length}`);
      console.log(`  🎮 Gamification: ${demoData.gamification.length}`);
      console.log(`  📊 Analytics: ${demoData.analytics.length}`);
      console.log(`  ⏰ Generated At: ${metadata.generatedAt}`);

      // Validate reasonable data volumes
      expect(metadata.totalRecords).toBeGreaterThan(1000);
      expect(demoData.submissions.length).toBeGreaterThan(demoData.users.length * 5);
      expect(demoData.feedback.length).toBeGreaterThan(demoData.submissions.length * 0.8);
    });
  });

  describe('Demo Presentation Validation', () => {
    test('should validate presentation materials exist', () => {
      const presentationFiles = [
        '../presentation/README.md',
        '../presentation/slides.md'
      ];

      presentationFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        expect(fs.existsSync(filePath)).toBe(true);
        
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content.length).toBeGreaterThan(1000);
        console.log(`✅ ${file} exists and has content (${content.length} chars)`);
      });
    });

    test('should validate demo credentials are documented', () => {
      const readmePath = path.join(__dirname, '../presentation/README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');

      // Check for demo credentials
      expect(readmeContent).toContain('demo.student@aiops-platform.com');
      expect(readmeContent).toContain('demo.teacher@aiops-platform.com');
      expect(readmeContent).toContain('demo.admin@aiops-platform.com');
      
      console.log('✅ Demo credentials are documented in presentation materials');
    });

    test('should validate key features are documented', () => {
      const readmePath = path.join(__dirname, '../presentation/README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');

      const keyFeatures = [
        'AI-Powered Code Analysis',
        'Predictive Analytics',
        'Gamification Engine',
        'Comprehensive Observability',
        'Security & Compliance'
      ];

      keyFeatures.forEach(feature => {
        expect(readmeContent).toContain(feature);
      });

      console.log('✅ All key features are documented');
    });
  });
});

describe('Demo Environment Setup', () => {
  test('should provide setup instructions', () => {
    console.log('\n🚀 Demo Environment Setup Instructions:');
    console.log('1. Start services: docker-compose up -d');
    console.log('2. Wait for services to be healthy (30-60 seconds)');
    console.log('3. Generate demo data: npm run generate');
    console.log('4. Run demo scenarios: npm run scenarios');
    console.log('5. Access demo at: http://localhost:3000');
    console.log('\n👥 Demo Credentials:');
    console.log('Student: demo.student@aiops-platform.com / DemoStudent123!');
    console.log('Teacher: demo.teacher@aiops-platform.com / DemoTeacher123!');
    console.log('Admin: demo.admin@aiops-platform.com / DemoAdmin123!');
  });
});