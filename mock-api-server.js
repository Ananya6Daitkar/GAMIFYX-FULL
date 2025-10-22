const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Load demo data
let demoData = {};
try {
  const demoDataPath = path.join(__dirname, 'demo', 'data-generator', 'demo-data.json');
  if (fs.existsSync(demoDataPath)) {
    demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));
    console.log('✅ Demo data loaded successfully');
    console.log(`📊 Data summary: ${demoData.users?.length || 0} users, ${demoData.submissions?.length || 0} submissions, ${demoData.competitions?.length || 0} competitions`);
  } else {
    console.log('⚠️ Demo data file not found, using mock data');
  }
} catch (error) {
  console.log('⚠️ Error loading demo data:', error.message);
}

// Mock data fallback
const mockData = {
  users: [
    { id: '1', name: 'Alex Chen', role: 'student', points: 2450, level: 7, badges: 5 },
    { id: '2', name: 'Sarah Kim', role: 'student', points: 2380, level: 6, badges: 4 },
    { id: '3', name: 'Dr. Johnson', role: 'teacher', name: 'Dr. Sarah Johnson' }
  ],
  competitions: [
    { id: '1', name: 'Hacktoberfest 2024', platform: 'github', status: 'active', participants: 25 },
    { id: '2', name: 'LeetCode Weekly', platform: 'leetcode', status: 'active', participants: 18 }
  ],
  submissions: [
    { id: '1', userId: '1', language: 'javascript', quality: 0.92, status: 'completed' },
    { id: '2', userId: '2', language: 'python', quality: 0.87, status: 'completed' }
  ]
};

// Use demo data if available, otherwise use mock data
const data = Object.keys(demoData).length > 0 ? demoData : mockData;

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Dashboard data
app.get('/api/gamifyx/dashboard/data', (req, res) => {
  const dashboardData = {
    totalUsers: data.users?.length || 0,
    totalSubmissions: data.submissions?.length || 0,
    totalCompetitions: data.competitions?.length || 0,
    totalAchievements: data.externalAchievements?.length || 0,
    activeUsers: Math.floor((data.users?.length || 0) * 0.75),
    systemHealth: {
      cpu: Math.random() * 30 + 20,
      memory: Math.random() * 40 + 30,
      disk: Math.random() * 20 + 10
    },
    recentActivity: [
      { type: 'submission', user: 'Alex Chen', action: 'submitted JavaScript algorithm', time: '2 minutes ago' },
      { type: 'achievement', user: 'Sarah Kim', action: 'earned Hacktoberfest badge', time: '5 minutes ago' },
      { type: 'competition', user: 'Mike Johnson', action: 'joined LeetCode contest', time: '8 minutes ago' }
    ]
  };
  res.json(dashboardData);
});

// Users
app.get('/api/users', (req, res) => {
  res.json(data.users || mockData.users);
});

app.get('/api/users/:id', (req, res) => {
  const user = (data.users || mockData.users).find(u => u.id === req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Competitions
app.get('/api/competitions', (req, res) => {
  res.json(data.competitions || mockData.competitions);
});

app.get('/api/competitions/:id', (req, res) => {
  const competition = (data.competitions || mockData.competitions).find(c => c.id === req.params.id);
  if (competition) {
    res.json(competition);
  } else {
    res.status(404).json({ error: 'Competition not found' });
  }
});

// Campaigns
app.get('/api/campaigns', (req, res) => {
  res.json(data.campaigns || []);
});

// External Achievements
app.get('/api/competitions/achievements', (req, res) => {
  res.json(data.externalAchievements || []);
});

// Submissions
app.get('/api/submissions', (req, res) => {
  res.json(data.submissions || mockData.submissions);
});

app.get('/api/submissions/recent', (req, res) => {
  const recent = (data.submissions || mockData.submissions).slice(-10);
  res.json(recent);
});

// Gamification
app.get('/api/gamification/leaderboard', (req, res) => {
  const leaderboard = (data.gamification || [])
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10)
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      points: entry.totalPoints,
      level: entry.level,
      badges: entry.badges?.length || 0
    }));
  res.json(leaderboard);
});

app.get('/api/gamification/profile/:userId', (req, res) => {
  const profile = (data.gamification || []).find(g => g.userId === req.params.userId);
  if (profile) {
    res.json(profile);
  } else {
    res.status(404).json({ error: 'Profile not found' });
  }
});

// Analytics
app.get('/api/analytics/risk-scores', (req, res) => {
  const riskScores = (data.analytics || []).map(a => ({
    userId: a.userId,
    riskScore: a.riskScore,
    trend: a.performanceTrend,
    lastUpdated: a.lastUpdated
  }));
  res.json(riskScores);
});

app.get('/api/analytics/performance', (req, res) => {
  const performance = {
    totalSubmissions: data.submissions?.length || 0,
    averageQuality: data.analytics?.reduce((sum, a) => sum + a.metrics.averageCodeQuality, 0) / (data.analytics?.length || 1) || 0.75,
    completionRate: 0.89,
    engagementScore: 0.82
  };
  res.json(performance);
});

// AI Feedback
app.get('/api/ai-feedback/metrics', (req, res) => {
  res.json({
    totalFeedback: data.feedback?.length || 0,
    averageProcessingTime: 15.2,
    accuracyScore: 0.94,
    userSatisfaction: 0.91
  });
});

app.get('/api/ai-feedback/predictions/batch', (req, res) => {
  res.json({
    predictions: [
      { userId: '1', nextQuality: 0.89, confidence: 0.87 },
      { userId: '2', nextQuality: 0.92, confidence: 0.91 }
    ]
  });
});

// WebSocket for real-time updates
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected to WebSocket');
  
  // Send initial data
  socket.emit('dashboard_update', {
    type: 'initial',
    data: {
      activeUsers: Math.floor((data.users?.length || 0) * 0.75),
      recentSubmissions: (data.submissions || []).slice(-5)
    }
  });
  
  // Send periodic updates
  const updateInterval = setInterval(() => {
    socket.emit('dashboard_update', {
      type: 'metrics',
      data: {
        cpu: Math.random() * 30 + 20,
        memory: Math.random() * 40 + 30,
        activeUsers: Math.floor((data.users?.length || 0) * 0.75) + Math.floor(Math.random() * 5 - 2)
      }
    });
  }, 5000);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected from WebSocket');
    clearInterval(updateInterval);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 GamifyX Mock API Server Started!');
  console.log('================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at: ws://localhost:${PORT}`);
  console.log('');
  console.log('📊 Available Endpoints:');
  console.log('  GET /health - Health check');
  console.log('  GET /api/gamifyx/dashboard/data - Dashboard data');
  console.log('  GET /api/users - All users');
  console.log('  GET /api/competitions - All competitions');
  console.log('  GET /api/gamification/leaderboard - Leaderboard');
  console.log('  GET /api/analytics/risk-scores - Risk scores');
  console.log('  GET /api/ai-feedback/metrics - AI metrics');
  console.log('');
  console.log('🎮 Frontend Dashboard: http://localhost:3000');
  console.log('');
  console.log('✨ Ready for fully interactive demo!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down GamifyX Mock API Server...');
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});