const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gamifyx-super-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load demo data
let demoData = {};
try {
  const demoDataPath = path.join(__dirname, '..', 'demo', 'data-generator', 'demo-data.json');
  if (fs.existsSync(demoDataPath)) {
    demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));
    console.log('✅ Demo data loaded successfully');
    console.log(`📊 Data: ${demoData.users?.length || 0} users, ${demoData.submissions?.length || 0} submissions, ${demoData.competitions?.length || 0} competitions`);
  }
} catch (error) {
  console.log('⚠️ Using fallback data');
}

// In-memory data store (in production, use a real database)
const dataStore = {
  users: demoData.users || [],
  submissions: demoData.submissions || [],
  competitions: demoData.competitions || [],
  campaigns: demoData.campaigns || [],
  externalAchievements: demoData.externalAchievements || [],
  gamification: demoData.gamification || [],
  analytics: demoData.analytics || [],
  feedback: demoData.feedback || [],
  sessions: new Map()
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Demo users for login
const demoUsers = [
  {
    id: 'demo-student-1',
    email: 'student@gamifyx.com',
    password: bcrypt.hashSync('student123', 10),
    firstName: 'Alex',
    lastName: 'Chen',
    role: 'student',
    avatar: '/images/avatars/student.png',
    profile: {
      university: 'Tech University',
      major: 'Computer Science',
      year: 3,
      skills: ['JavaScript', 'Python', 'Docker', 'Kubernetes'],
      githubUsername: 'alexchen-dev'
    }
  },
  {
    id: 'demo-teacher-1',
    email: 'teacher@gamifyx.com',
    password: bcrypt.hashSync('teacher123', 10),
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    role: 'teacher',
    avatar: '/images/avatars/teacher.png',
    profile: {
      university: 'Tech University',
      department: 'Computer Science',
      title: 'Associate Professor',
      expertise: ['DevOps', 'Cloud Computing', 'AI/ML']
    }
  },
  {
    id: 'demo-admin-1',
    email: 'admin@gamifyx.com',
    password: bcrypt.hashSync('admin123', 10),
    firstName: 'Mike',
    lastName: 'Rodriguez',
    role: 'admin',
    avatar: '/images/avatars/admin.png',
    profile: {
      title: 'Platform Administrator',
      department: 'IT Operations'
    }
  }
];

// API Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = demoUsers.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Dashboard Data
app.get('/api/dashboard/overview', authenticateToken, (req, res) => {
  const overview = {
    totalUsers: dataStore.users.length,
    totalSubmissions: dataStore.submissions.length,
    totalCompetitions: dataStore.competitions.length,
    totalAchievements: dataStore.externalAchievements.length,
    activeUsers: Math.floor(dataStore.users.length * 0.75),
    systemHealth: {
      cpu: Math.random() * 30 + 20,
      memory: Math.random() * 40 + 30,
      disk: Math.random() * 20 + 10,
      network: Math.random() * 15 + 5
    },
    recentActivity: [
      { type: 'submission', user: 'Alex Chen', action: 'submitted JavaScript algorithm', time: '2 minutes ago', icon: '📝' },
      { type: 'achievement', user: 'Sarah Kim', action: 'earned Hacktoberfest badge', time: '5 minutes ago', icon: '🏆' },
      { type: 'competition', user: 'Mike Johnson', action: 'joined LeetCode contest', time: '8 minutes ago', icon: '🎯' },
      { type: 'feedback', user: 'Emma Davis', action: 'received AI feedback', time: '12 minutes ago', icon: '🤖' }
    ],
    stats: {
      submissionsToday: Math.floor(Math.random() * 50) + 20,
      averageQuality: 0.87,
      completionRate: 0.92,
      engagementScore: 0.89
    }
  };
  res.json(overview);
});

// Student Dashboard
app.get('/api/student/dashboard', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const studentData = {
    profile: {
      name: 'Alex Chen',
      level: 7,
      points: 2450,
      rank: 3,
      streak: 12,
      badges: [
        { name: 'First Steps', icon: '🎯', earned: '2024-01-15' },
        { name: 'Code Quality', icon: '⭐', earned: '2024-02-20' },
        { name: 'Hacktoberfest', icon: '🎃', earned: '2024-10-15' },
        { name: 'Security Expert', icon: '🛡️', earned: '2024-03-10' },
        { name: 'Team Player', icon: '🤝', earned: '2024-04-05' }
      ]
    },
    competitions: {
      active: [
        {
          id: 1,
          name: 'Hacktoberfest 2024',
          platform: 'GitHub',
          progress: 4,
          total: 4,
          status: 'completed',
          points: 500,
          deadline: '2024-10-31'
        },
        {
          id: 2,
          name: 'LeetCode Weekly Contest',
          platform: 'LeetCode',
          progress: 2,
          total: 4,
          status: 'active',
          points: 150,
          deadline: '2024-10-25'
        }
      ],
      completed: [
        {
          id: 3,
          name: 'GitHub Arctic Code Vault',
          platform: 'GitHub',
          points: 200,
          completedDate: '2024-09-15'
        }
      ]
    },
    submissions: {
      recent: [
        {
          id: 1,
          title: 'Binary Search Algorithm',
          language: 'JavaScript',
          quality: 0.92,
          feedback: 'Excellent implementation with proper error handling',
          submittedAt: '2024-10-20T10:30:00Z',
          status: 'completed'
        },
        {
          id: 2,
          title: 'REST API Design',
          language: 'Python',
          quality: 0.87,
          feedback: 'Good structure, consider adding input validation',
          submittedAt: '2024-10-19T14:20:00Z',
          status: 'completed'
        }
      ],
      stats: {
        total: 45,
        averageQuality: 0.89,
        languages: ['JavaScript', 'Python', 'Java', 'TypeScript'],
        weeklyProgress: [12, 8, 15, 10, 18, 14, 9]
      }
    },
    achievements: {
      external: [
        {
          platform: 'GitHub',
          type: 'Pull Request',
          title: 'Contributed to open-source project',
          date: '2024-10-18',
          verified: true,
          points: 100
        },
        {
          platform: 'LeetCode',
          type: 'Contest',
          title: 'Weekly Contest #420',
          date: '2024-10-15',
          verified: true,
          points: 75
        }
      ]
    }
  };

  res.json(studentData);
});

// Teacher Dashboard
app.get('/api/teacher/dashboard', authenticateToken, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const teacherData = {
    classes: [
      {
        id: 1,
        name: 'DevOps Fundamentals',
        students: 28,
        activeAssignments: 3,
        averageGrade: 87.5,
        engagementScore: 0.89
      },
      {
        id: 2,
        name: 'Advanced Cloud Computing',
        students: 22,
        activeAssignments: 2,
        averageGrade: 91.2,
        engagementScore: 0.94
      }
    ],
    students: {
      atRisk: [
        {
          id: 1,
          name: 'John Smith',
          riskScore: 0.85,
          lastActivity: '5 days ago',
          issues: ['Low submission frequency', 'Declining code quality'],
          recommendations: ['Schedule 1-on-1 meeting', 'Provide additional resources']
        },
        {
          id: 2,
          name: 'Lisa Wang',
          riskScore: 0.72,
          lastActivity: '3 days ago',
          issues: ['Missing deadlines'],
          recommendations: ['Send reminder notifications']
        }
      ],
      topPerformers: [
        {
          id: 3,
          name: 'Alex Chen',
          points: 2450,
          qualityScore: 0.92,
          streak: 12
        },
        {
          id: 4,
          name: 'Sarah Kim',
          points: 2380,
          qualityScore: 0.89,
          streak: 8
        }
      ]
    },
    campaigns: [
      {
        id: 1,
        name: 'Hacktoberfest Class Challenge',
        competition: 'Hacktoberfest 2024',
        participants: 25,
        completionRate: 0.76,
        averageScore: 0.88,
        status: 'active',
        endDate: '2024-10-31'
      },
      {
        id: 2,
        name: 'Algorithm Challenge',
        competition: 'LeetCode Weekly',
        participants: 18,
        completionRate: 0.61,
        averageScore: 0.82,
        status: 'active',
        endDate: '2024-10-25'
      }
    ],
    analytics: {
      submissionTrends: [45, 52, 48, 61, 55, 58, 63],
      qualityTrends: [0.82, 0.85, 0.83, 0.87, 0.89, 0.88, 0.91],
      engagementMetrics: {
        dailyActiveUsers: 0.78,
        assignmentCompletion: 0.85,
        forumParticipation: 0.62
      }
    }
  };

  res.json(teacherData);
});

// Competition Management
app.get('/api/competitions', authenticateToken, (req, res) => {
  const competitions = dataStore.competitions.map(comp => ({
    ...comp,
    participants: Math.floor(Math.random() * 100) + 20,
    status: new Date() > new Date(comp.endDate) ? 'completed' : 'active'
  }));
  res.json(competitions);
});

app.get('/api/competitions/:id', authenticateToken, (req, res) => {
  const competition = dataStore.competitions.find(c => c.id === req.params.id);
  if (!competition) {
    return res.status(404).json({ error: 'Competition not found' });
  }
  res.json(competition);
});

// Campaign Management
app.get('/api/campaigns', authenticateToken, (req, res) => {
  res.json(dataStore.campaigns);
});

app.post('/api/campaigns', authenticateToken, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const campaign = {
    id: uuidv4(),
    ...req.body,
    instructorId: req.user.id,
    createdAt: new Date(),
    participants: []
  };

  dataStore.campaigns.push(campaign);
  res.status(201).json(campaign);
});

// Gamification
app.get('/api/gamification/leaderboard', authenticateToken, (req, res) => {
  const leaderboard = dataStore.gamification
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 20)
    .map((entry, index) => {
      const user = dataStore.users.find(u => u.id === entry.userId);
      return {
        rank: index + 1,
        userId: entry.userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        points: entry.totalPoints,
        level: entry.level,
        badges: entry.badges?.length || 0,
        avatar: user?.avatar || '/images/avatars/default.png'
      };
    });
  res.json(leaderboard);
});

app.get('/api/gamification/profile/:userId', authenticateToken, (req, res) => {
  const profile = dataStore.gamification.find(g => g.userId === req.params.userId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

// Analytics
app.get('/api/analytics/risk-scores', authenticateToken, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const riskScores = dataStore.analytics.map(a => {
    const user = dataStore.users.find(u => u.id === a.userId);
    return {
      userId: a.userId,
      name: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
      riskScore: a.riskScore,
      trend: a.performanceTrend,
      lastActivity: moment().subtract(Math.floor(Math.random() * 7), 'days').fromNow(),
      recommendations: a.alerts?.map(alert => alert.message) || []
    };
  });
  res.json(riskScores);
});

// AI Feedback
app.get('/api/ai-feedback/metrics', authenticateToken, (req, res) => {
  res.json({
    totalFeedback: dataStore.feedback.length,
    averageProcessingTime: 15.2,
    accuracyScore: 0.94,
    userSatisfaction: 0.91,
    feedbackTypes: {
      codeQuality: 0.35,
      security: 0.25,
      performance: 0.20,
      bestPractices: 0.20
    }
  });
});

// Submissions
app.get('/api/submissions/recent', authenticateToken, (req, res) => {
  const recent = dataStore.submissions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(sub => {
      const user = dataStore.users.find(u => u.id === sub.userId);
      const feedback = dataStore.feedback.find(f => f.submissionId === sub.id);
      return {
        ...sub,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        feedback: feedback ? feedback.suggestions.slice(0, 2) : []
      };
    });
  res.json(recent);
});

// Code Submission
app.post('/api/submissions', authenticateToken, (req, res) => {
  const submission = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    createdAt: new Date(),
    status: 'processing'
  };

  dataStore.submissions.push(submission);

  // Simulate AI processing
  setTimeout(() => {
    submission.status = 'completed';
    submission.metrics = {
      codeQuality: Math.random() * 0.3 + 0.7,
      security: Math.random() * 0.2 + 0.8,
      performance: Math.random() * 0.25 + 0.75
    };

    // Generate AI feedback
    const feedback = {
      id: uuidv4(),
      submissionId: submission.id,
      userId: req.user.id,
      overallScore: submission.metrics.codeQuality,
      suggestions: [
        'Consider adding input validation for better security',
        'Code structure is good, consider extracting reusable functions',
        'Performance can be improved by optimizing the algorithm complexity'
      ],
      createdAt: new Date()
    };

    dataStore.feedback.push(feedback);

    // Emit real-time update
    io.emit('submission_completed', { submission, feedback });
  }, 3000);

  res.status(201).json(submission);
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Send initial dashboard data
  socket.emit('dashboard_update', {
    type: 'initial',
    data: {
      activeUsers: Math.floor(dataStore.users.length * 0.75),
      onlineUsers: Math.floor(Math.random() * 20) + 10
    }
  });

  // Send periodic updates
  const updateInterval = setInterval(() => {
    socket.emit('dashboard_update', {
      type: 'metrics',
      data: {
        cpu: Math.random() * 30 + 20,
        memory: Math.random() * 40 + 30,
        network: Math.random() * 15 + 5,
        activeUsers: Math.floor(dataStore.users.length * 0.75) + Math.floor(Math.random() * 5 - 2),
        timestamp: new Date()
      }
    });
  }, 5000);

  // Handle user joining specific rooms
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    clearInterval(updateInterval);
  });
});

// Serve static files and handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 GamifyX Complete Platform Started!');
  console.log('=====================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at: ws://localhost:${PORT}`);
  console.log('');
  console.log('👥 Demo Login Credentials:');
  console.log('  📚 Student: student@gamifyx.com / student123');
  console.log('  👩‍🏫 Teacher: teacher@gamifyx.com / teacher123');
  console.log('  👨‍💼 Admin: admin@gamifyx.com / admin123');
  console.log('');
  console.log('📊 Available Features:');
  console.log('  ✅ Student Dashboard with Competition Tracking');
  console.log('  ✅ Teacher Dashboard with Analytics & Risk Scores');
  console.log('  ✅ Admin Dashboard with System Overview');
  console.log('  ✅ AI-Powered Code Analysis & Feedback');
  console.log('  ✅ External Competition Integration (GitHub, LeetCode)');
  console.log('  ✅ Real-time Gamification (Points, Badges, Leaderboards)');
  console.log('  ✅ Campaign Management for Teachers');
  console.log('  ✅ WebSocket Real-time Updates');
  console.log('  ✅ Cyberpunk Theme with Animations');
  console.log('');
  console.log('🎮 Ready for full interactive experience!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down GamifyX Platform...');
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});