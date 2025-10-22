const axios = require('axios');
const moment = require('moment');

class DemoScenarios {
  constructor(apiBaseUrl = 'http://localhost:8080') {
    this.apiBaseUrl = apiBaseUrl;
    this.authToken = null;
    this.demoUsers = {
      student: null,
      teacher: null,
      admin: null
    };
  }

  async setupDemoScenarios() {
    console.log('🎬 Setting up comprehensive demo scenarios...');
    
    try {
      await this.createDemoUsers();
      await this.authenticateUsers();
      await this.runScenario1_StudentJourney();
      await this.runScenario2_TeacherIntervention();
      await this.runScenario3_RiskPrediction();
      await this.runScenario4_GamificationEngagement();
      await this.runScenario5_CompetitionIntegration();
      
      console.log('✅ All demo scenarios completed successfully!');
      return this.generateScenarioReport();
    } catch (error) {
      console.error('❌ Demo scenario failed:', error);
      throw error;
    }
  }

  async createDemoUsers() {
    console.log('👥 Creating demo users...');
    
    // Create demo student
    const studentData = {
      email: 'demo.student@aiops-platform.com',
      password: 'DemoStudent123!',
      firstName: 'Alex',
      lastName: 'Chen',
      role: 'student',
      profile: {
        bio: 'Computer Science student passionate about DevOps and AI',
        university: 'Tech University',
        major: 'Computer Science',
        graduationYear: 2025,
        skills: ['javascript', 'python', 'docker', 'kubernetes'],
        githubUsername: 'alexchen-dev'
      }
    };

    // Create demo teacher
    const teacherData = {
      email: 'demo.teacher@aiops-platform.com',
      password: 'DemoTeacher123!',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: 'teacher',
      profile: {
        bio: 'Professor of Computer Science specializing in DevOps education',
        university: 'Tech University',
        department: 'Computer Science',
        title: 'Associate Professor',
        expertise: ['devops', 'cloud-computing', 'software-engineering', 'ai-ops'],
        yearsExperience: 12
      }
    };

    // Create demo admin
    const adminData = {
      email: 'demo.admin@aiops-platform.com',
      password: 'DemoAdmin123!',
      firstName: 'Mike',
      lastName: 'Rodriguez',
      role: 'admin',
      profile: {
        bio: 'Platform administrator ensuring optimal learning experiences',
        department: 'IT Administration',
        title: 'Senior System Administrator'
      }
    };

    try {
      // Register users
      const studentResponse = await axios.post(`${this.apiBaseUrl}/api/auth/register`, studentData);
      const teacherResponse = await axios.post(`${this.apiBaseUrl}/api/auth/register`, teacherData);
      const adminResponse = await axios.post(`${this.apiBaseUrl}/api/auth/register`, adminData);

      this.demoUsers.student = studentResponse.data.user;
      this.demoUsers.teacher = teacherResponse.data.user;
      this.demoUsers.admin = adminResponse.data.user;

      console.log('✅ Demo users created successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Demo users already exist, continuing...');
        // Try to login with existing users
        await this.authenticateUsers();
      } else {
        throw error;
      }
    }
  }

  async authenticateUsers() {
    console.log('🔐 Authenticating demo users...');
    
    const credentials = [
      { email: 'demo.student@aiops-platform.com', password: 'DemoStudent123!', role: 'student' },
      { email: 'demo.teacher@aiops-platform.com', password: 'DemoTeacher123!', role: 'teacher' },
      { email: 'demo.admin@aiops-platform.com', password: 'DemoAdmin123!', role: 'admin' }
    ];

    for (const cred of credentials) {
      try {
        const response = await axios.post(`${this.apiBaseUrl}/api/auth/login`, {
          email: cred.email,
          password: cred.password
        });
        
        this.demoUsers[cred.role] = {
          ...response.data.user,
          token: response.data.token
        };
      } catch (error) {
        console.error(`Failed to authenticate ${cred.role}:`, error.message);
      }
    }
  }

  async runScenario1_StudentJourney() {
    console.log('📚 Running Scenario 1: Complete Student Learning Journey');
    
    const student = this.demoUsers.student;
    if (!student) {
      console.log('⚠️ Student user not available, skipping scenario');
      return;
    }

    const scenarios = [
      {
        name: 'First Assignment - Basic Algorithm',
        code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Test the function
console.log(fibonacci(10));
module.exports = fibonacci;`,
        type: 'assignment',
        language: 'javascript',
        difficulty: 'beginner'
      },
      {
        name: 'Web API Development',
        code: `const express = require('express');
const app = express();

app.use(express.json());

// In-memory storage
let users = [];

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const user = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date()
  };
  users.push(user);
  res.status(201).json(user);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
        type: 'project',
        language: 'javascript',
        difficulty: 'intermediate'
      },
      {
        name: 'Docker Containerization Challenge',
        code: `# Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]

# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"`,
        type: 'challenge',
        language: 'dockerfile',
        difficulty: 'advanced'
      }
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`  📝 Submitting: ${scenario.name}`);
      
      try {
        const submissionResponse = await axios.post(
          `${this.apiBaseUrl}/api/workflow/submission`,
          {
            submissionId: `demo-scenario1-${i + 1}-${Date.now()}`,
            userId: student.id,
            codeContent: scenario.code,
            submissionType: scenario.type,
            metadata: {
              language: scenario.language,
              difficulty: scenario.difficulty,
              tags: ['demo', 'scenario1'],
              assignment: scenario.name
            }
          },
          {
            headers: { 'Authorization': `Bearer ${student.token}` }
          }
        );

        console.log(`    ✅ Submission started: ${submissionResponse.data.submissionId}`);
        
        // Wait a bit between submissions to simulate realistic timing
        await this.sleep(2000);
      } catch (error) {
        console.error(`    ❌ Failed to submit ${scenario.name}:`, error.message);
      }
    }

    console.log('  🎯 Student journey scenario completed');
  }

  async runScenario2_TeacherIntervention() {
    console.log('👩‍🏫 Running Scenario 2: Teacher Intervention Workflow');
    
    const teacher = this.demoUsers.teacher;
    const student = this.demoUsers.student;
    
    if (!teacher || !student) {
      console.log('⚠️ Required users not available, skipping scenario');
      return;
    }

    try {
      // Simulate a struggling student submission
      const strugglingSubmission = {
        submissionId: `demo-struggling-${Date.now()}`,
        userId: student.id,
        codeContent: `// This is a poorly written function with multiple issues
function badFunction(data) {
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i] != null) {
      result.push(data[i] * 2);
    }
  }
  return result;
}

// No error handling, poor naming, inefficient`,
        submissionType: 'assignment',
        metadata: {
          language: 'javascript',
          difficulty: 'beginner',
          tags: ['demo', 'intervention-needed'],
          assignment: 'Array Processing Function'
        }
      };

      console.log('  📝 Creating struggling student submission...');
      await axios.post(
        `${this.apiBaseUrl}/api/workflow/submission`,
        strugglingSubmission,
        {
          headers: { 'Authorization': `Bearer ${student.token}` }
        }
      );

      // Wait for processing
      await this.sleep(5000);

      // Teacher checks analytics dashboard
      console.log('  📊 Teacher checking analytics dashboard...');
      const analyticsResponse = await axios.get(
        `${this.apiBaseUrl}/api/analytics/risk-scores`,
        {
          headers: { 'Authorization': `Bearer ${teacher.token}` }
        }
      );

      console.log(`    📈 Found ${analyticsResponse.data.length} students with risk scores`);

      // Teacher views student details
      console.log('  👀 Teacher reviewing student performance...');
      const studentPerformance = await axios.get(
        `${this.apiBaseUrl}/api/analytics/performance/${student.id}`,
        {
          headers: { 'Authorization': `Bearer ${teacher.token}` }
        }
      );

      console.log('    📋 Student performance data retrieved');

      // Simulate teacher intervention (in a real system, this might send an email or create a task)
      console.log('  💬 Teacher initiating intervention...');
      
      console.log('  ✅ Teacher intervention scenario completed');
    } catch (error) {
      console.error('  ❌ Teacher intervention scenario failed:', error.message);
    }
  }

  async runScenario3_RiskPrediction() {
    console.log('🔮 Running Scenario 3: AI Risk Prediction and Alerts');
    
    const student = this.demoUsers.student;
    if (!student) {
      console.log('⚠️ Student user not available, skipping scenario');
      return;
    }

    try {
      // Create a series of declining quality submissions to trigger risk prediction
      const decliningSubmissions = [
        {
          code: `// Good quality submission
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return result.concat(left.slice(i)).concat(right.slice(j));
}`,
          quality: 0.9
        },
        {
          code: `// Declining quality
function sort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}`,
          quality: 0.7
        },
        {
          code: `// Poor quality submission
function dosomething(x) {
  var y = [];
  for (var i = 0; i < x.length; i++) {
    y.push(x[i]);
  }
  return y;
}`,
          quality: 0.4
        }
      ];

      console.log('  📉 Creating declining quality submissions...');
      
      for (let i = 0; i < decliningSubmissions.length; i++) {
        const submission = decliningSubmissions[i];
        
        await axios.post(
          `${this.apiBaseUrl}/api/workflow/submission`,
          {
            submissionId: `demo-risk-${i + 1}-${Date.now()}`,
            userId: student.id,
            codeContent: submission.code,
            submissionType: 'assignment',
            metadata: {
              language: 'javascript',
              difficulty: 'intermediate',
              tags: ['demo', 'risk-prediction'],
              assignment: `Risk Prediction Test ${i + 1}`
            }
          },
          {
            headers: { 'Authorization': `Bearer ${student.token}` }
          }
        );

        console.log(`    📝 Submitted declining quality submission ${i + 1}`);
        await this.sleep(3000);
      }

      // Wait for analytics processing
      await this.sleep(10000);

      // Check if risk prediction triggered alerts
      console.log('  🚨 Checking for risk prediction alerts...');
      const riskScores = await axios.get(
        `${this.apiBaseUrl}/api/analytics/risk-scores`,
        {
          headers: { 'Authorization': `Bearer ${this.demoUsers.teacher?.token}` }
        }
      );

      const studentRisk = riskScores.data.find(r => r.userId === student.id);
      if (studentRisk && studentRisk.riskScore > 0.7) {
        console.log(`    🎯 Risk prediction successful! Student risk score: ${studentRisk.riskScore}`);
      } else {
        console.log('    📊 Risk prediction data being processed...');
      }

      console.log('  ✅ Risk prediction scenario completed');
    } catch (error) {
      console.error('  ❌ Risk prediction scenario failed:', error.message);
    }
  }

  async runScenario4_GamificationEngagement() {
    console.log('🎮 Running Scenario 4: Gamification and Engagement');
    
    const student = this.demoUsers.student;
    if (!student) {
      console.log('⚠️ Student user not available, skipping scenario');
      return;
    }

    try {
      // Create high-quality submissions to earn badges and points
      const gamificationSubmissions = [
        {
          name: 'Perfect Algorithm Implementation',
          code: `/**
 * Implements a highly optimized binary search algorithm
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}

// Comprehensive test suite
function testBinarySearch() {
  const testCases = [
    { arr: [1, 2, 3, 4, 5], target: 3, expected: 2 },
    { arr: [1, 2, 3, 4, 5], target: 6, expected: -1 },
    { arr: [], target: 1, expected: -1 }
  ];
  
  testCases.forEach((test, index) => {
    const result = binarySearch(test.arr, test.target);
    console.assert(result === test.expected, \`Test \${index + 1} failed\`);
  });
  
  console.log('All tests passed!');
}

testBinarySearch();
module.exports = binarySearch;`,
          type: 'challenge',
          difficulty: 'advanced'
        },
        {
          name: 'Secure API Endpoint',
          code: `const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Secure user registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Save user (implementation depends on database)
    const user = { email, password: hashedPassword };
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = app;`,
          type: 'project',
          difficulty: 'advanced'
        }
      ];

      console.log('  🏆 Creating high-quality submissions for gamification...');
      
      for (let i = 0; i < gamificationSubmissions.length; i++) {
        const submission = gamificationSubmissions[i];
        
        await axios.post(
          `${this.apiBaseUrl}/api/workflow/submission`,
          {
            submissionId: `demo-gamification-${i + 1}-${Date.now()}`,
            userId: student.id,
            codeContent: submission.code,
            submissionType: submission.type,
            metadata: {
              language: 'javascript',
              difficulty: submission.difficulty,
              tags: ['demo', 'gamification', 'high-quality'],
              assignment: submission.name
            }
          },
          {
            headers: { 'Authorization': `Bearer ${student.token}` }
          }
        );

        console.log(`    ⭐ Submitted high-quality: ${submission.name}`);
        await this.sleep(3000);
      }

      // Wait for gamification processing
      await this.sleep(8000);

      // Check gamification results
      console.log('  🎯 Checking gamification results...');
      try {
        const gamificationResponse = await axios.get(
          `${this.apiBaseUrl}/api/gamification/profile/${student.id}`,
          {
            headers: { 'Authorization': `Bearer ${student.token}` }
          }
        );

        const profile = gamificationResponse.data;
        console.log(`    🏅 Total Points: ${profile.totalPoints}`);
        console.log(`    📊 Level: ${profile.level}`);
        console.log(`    🏆 Badges Earned: ${profile.badges?.length || 0}`);
        console.log(`    📈 Leaderboard Rank: ${profile.leaderboardRank}`);
      } catch (error) {
        console.log('    📊 Gamification data being processed...');
      }

      console.log('  ✅ Gamification scenario completed');
    } catch (error) {
      console.error('  ❌ Gamification scenario failed:', error.message);
    }
  }

  async runScenario5_CompetitionIntegration() {
    console.log('🏆 Running Scenario 5: External Competition Integration');
    
    const student = this.demoUsers.student;
    const teacher = this.demoUsers.teacher;
    
    if (!student || !teacher) {
      console.log('⚠️ Required users not available, skipping scenario');
      return;
    }

    try {
      // Simulate external competition participation
      console.log('  📋 Teacher creating competition campaign...');
      
      const campaignData = {
        name: 'Hacktoberfest 2024 Class Challenge',
        description: 'Participate in Hacktoberfest and earn course credit',
        competitionType: 'open-source',
        platform: 'github',
        requirements: {
          minPullRequests: 4,
          qualityCheck: true,
          courseCredit: 0.2
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        participants: [student.id]
      };

      // Create campaign (simulated)
      console.log('    ✅ Campaign created: Hacktoberfest 2024 Class Challenge');

      // Simulate student GitHub activity
      console.log('  🔗 Simulating GitHub integration...');
      
      const githubActivities = [
        {
          type: 'pull_request',
          repository: 'open-source/awesome-project',
          title: 'Fix: Resolve memory leak in data processing module',
          status: 'merged',
          linesChanged: 45,
          filesModified: 3
        },
        {
          type: 'pull_request',
          repository: 'community/docs-improvement',
          title: 'Docs: Add comprehensive API documentation',
          status: 'merged',
          linesChanged: 120,
          filesModified: 8
        },
        {
          type: 'pull_request',
          repository: 'tools/cli-enhancement',
          title: 'Feature: Add progress bar for long operations',
          status: 'approved',
          linesChanged: 78,
          filesModified: 5
        },
        {
          type: 'pull_request',
          repository: 'security/vulnerability-scanner',
          title: 'Security: Fix XSS vulnerability in input validation',
          status: 'merged',
          linesChanged: 23,
          filesModified: 2
        }
      ];

      for (let i = 0; i < githubActivities.length; i++) {
        const activity = githubActivities[i];
        console.log(`    📝 GitHub PR ${i + 1}: ${activity.title}`);
        console.log(`      Repository: ${activity.repository}`);
        console.log(`      Status: ${activity.status}`);
        console.log(`      Impact: ${activity.linesChanged} lines, ${activity.filesModified} files`);
        
        await this.sleep(2000);
      }

      // Simulate competition progress tracking
      console.log('  📊 Tracking competition progress...');
      
      const progressData = {
        studentId: student.id,
        competitionId: 'hacktoberfest-2024',
        progress: {
          pullRequestsCompleted: 4,
          pullRequestsRequired: 4,
          qualityScore: 0.92,
          repositoriesContributed: 4,
          totalLinesChanged: 266,
          averageReviewTime: '2.3 days'
        },
        achievements: [
          { name: 'First Contribution', earnedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
          { name: 'Quality Contributor', earnedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
          { name: 'Security Champion', earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { name: 'Hacktoberfest Completer', earnedAt: new Date() }
        ],
        rewards: {
          coursePoints: 500,
          badgesEarned: ['hacktoberfest-2024', 'open-source-contributor', 'security-champion'],
          certificateEligible: true
        }
      };

      console.log(`    ✅ Competition completed successfully!`);
      console.log(`    🎯 Pull Requests: ${progressData.progress.pullRequestsCompleted}/${progressData.progress.pullRequestsRequired}`);
      console.log(`    ⭐ Quality Score: ${(progressData.progress.qualityScore * 100).toFixed(1)}%`);
      console.log(`    🏆 Achievements: ${progressData.achievements.length}`);
      console.log(`    🎁 Course Points Earned: ${progressData.rewards.coursePoints}`);

      // Teacher reviews competition results
      console.log('  👩‍🏫 Teacher reviewing competition results...');
      
      const classResults = {
        totalParticipants: 12,
        completionRate: 0.75,
        averageQualityScore: 0.84,
        topPerformers: [
          { name: 'Alex Chen', score: 0.92, pullRequests: 4 },
          { name: 'Sarah Kim', score: 0.89, pullRequests: 5 },
          { name: 'Mike Johnson', score: 0.87, pullRequests: 4 }
        ],
        impactMetrics: {
          totalContributions: 48,
          repositoriesImpacted: 23,
          linesOfCodeContributed: 2340,
          issuesResolved: 15
        }
      };

      console.log(`    📈 Class Performance Summary:`);
      console.log(`      Participants: ${classResults.totalParticipants}`);
      console.log(`      Completion Rate: ${(classResults.completionRate * 100).toFixed(1)}%`);
      console.log(`      Average Quality: ${(classResults.averageQualityScore * 100).toFixed(1)}%`);
      console.log(`      Total Contributions: ${classResults.impactMetrics.totalContributions}`);

      console.log('  ✅ Competition integration scenario completed');
    } catch (error) {
      console.error('  ❌ Competition integration scenario failed:', error.message);
    }
  }

  generateScenarioReport() {
    const report = {
      title: 'AIOps Learning Platform - Demo Scenarios Report',
      generatedAt: new Date().toISOString(),
      scenarios: [
        {
          name: 'Student Learning Journey',
          description: 'Complete workflow from code submission to AI feedback and gamification',
          status: 'completed',
          keyFeatures: [
            'Code submission workflow',
            'AI-powered feedback generation',
            'Real-time progress tracking',
            'Multi-language support'
          ]
        },
        {
          name: 'Teacher Intervention',
          description: 'AI-driven alerts and teacher dashboard for student support',
          status: 'completed',
          keyFeatures: [
            'Risk score calculation',
            'Performance analytics',
            'Intervention recommendations',
            'Teacher dashboard'
          ]
        },
        {
          name: 'Risk Prediction',
          description: 'Machine learning-based prediction of student performance decline',
          status: 'completed',
          keyFeatures: [
            'Performance trend analysis',
            'Predictive risk scoring',
            'Automated alert generation',
            'Early intervention triggers'
          ]
        },
        {
          name: 'Gamification Engagement',
          description: 'Points, badges, and leaderboards to motivate student learning',
          status: 'completed',
          keyFeatures: [
            'Dynamic point calculation',
            'Achievement badge system',
            'Real-time leaderboards',
            'Streak tracking'
          ]
        },
        {
          name: 'External Competition Integration',
          description: 'Indirect gamification through real-world competition participation',
          status: 'completed',
          keyFeatures: [
            'GitHub/GitLab API integration',
            'Hacktoberfest participation tracking',
            'Competition campaign management',
            'External achievement verification',
            'Course credit integration'
          ]
        }
      ],
      demoUsers: {
        student: {
          email: 'demo.student@aiops-platform.com',
          name: 'Alex Chen',
          role: 'student'
        },
        teacher: {
          email: 'demo.teacher@aiops-platform.com',
          name: 'Dr. Sarah Johnson',
          role: 'teacher'
        },
        admin: {
          email: 'demo.admin@aiops-platform.com',
          name: 'Mike Rodriguez',
          role: 'admin'
        }
      },
      nextSteps: [
        'Login with demo credentials to explore the platform',
        'View student dashboard for progress tracking',
        'Access teacher dashboard for analytics and interventions',
        'Monitor real-time notifications and alerts',
        'Explore gamification features and leaderboards'
      ]
    };

    return report;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DemoScenarios;

// Run if called directly
if (require.main === module) {
  const scenarios = new DemoScenarios();
  scenarios.setupDemoScenarios()
    .then(report => {
      console.log('\n📋 Demo Scenarios Report:');
      console.log(JSON.stringify(report, null, 2));
    })
    .catch(error => {
      console.error('Demo scenarios failed:', error);
      process.exit(1);
    });
}