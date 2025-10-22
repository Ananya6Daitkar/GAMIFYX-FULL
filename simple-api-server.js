const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8080"],
    methods: ["GET", "POST"]
  }
});
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for the GamifyX dashboard
const mockData = {
  users: [
    { id: 1, name: 'Alice Johnson', role: 'student', points: 1250, level: 5, badges: ['Code Ninja', 'Bug Hunter'] },
    { id: 2, name: 'Bob Smith', role: 'student', points: 980, level: 4, badges: ['Quick Learner'] },
    { id: 3, name: 'Carol Davis', role: 'teacher', points: 2100, level: 8, badges: ['Mentor', 'Code Master'] }
  ],
  leaderboard: [
    { rank: 1, name: 'Carol Davis', points: 2100, change: '+50' },
    { rank: 2, name: 'Alice Johnson', points: 1250, change: '+25' },
    { rank: 3, name: 'Bob Smith', points: 980, change: '-10' }
  ],
  dashboard: {
    totalUsers: 156,
    activeUsers: 89,
    totalSubmissions: 342,
    averageScore: 78.5,
    systemHealth: 'excellent',
    alerts: [
      { id: 1, type: 'info', message: 'New achievement unlocked by 5 students', timestamp: new Date() },
      { id: 2, type: 'warning', message: 'Server load at 75%', timestamp: new Date() }
    ]
  },
  achievements: [
    { id: 1, name: 'First Steps', description: 'Complete your first submission', icon: '🎯', rarity: 'common' },
    { id: 2, name: 'Code Ninja', description: 'Submit 10 perfect solutions', icon: '🥷', rarity: 'rare' },
    { id: 3, name: 'Bug Hunter', description: 'Find and fix 5 critical bugs', icon: '🐛', rarity: 'epic' }
  ],
  submissions: [
    { id: 1, userId: 1, title: 'Docker Security Lab', status: 'completed', score: 95, timestamp: new Date() },
    { id: 2, userId: 2, title: 'Kubernetes Deployment', status: 'in-progress', score: null, timestamp: new Date() }
  ]
};

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), service: 'GamifyX API' });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json(mockData.dashboard);
});

app.get('/api/users', (req, res) => {
  res.json(mockData.users);
});

app.get('/api/leaderboard', (req, res) => {
  res.json(mockData.leaderboard);
});

app.get('/api/achievements', (req, res) => {
  res.json(mockData.achievements);
});

app.get('/api/submissions', (req, res) => {
  res.json(mockData.submissions);
});

app.get('/api/gamifyx/dashboard/data', (req, res) => {
  res.json({
    ...mockData.dashboard,
    leaderboard: mockData.leaderboard,
    recentAchievements: mockData.achievements.slice(0, 3),
    recentSubmissions: mockData.submissions
  });
});

app.get('/api/ai-feedback/metrics', (req, res) => {
  res.json({
    totalFeedback: 234,
    averageRating: 4.2,
    processingTime: '1.2s',
    accuracy: 89.5
  });
});

app.get('/api/ai-feedback/predictions/batch', (req, res) => {
  res.json({
    predictions: [
      { userId: 1, riskScore: 0.2, confidence: 0.85, recommendation: 'Continue current pace' },
      { userId: 2, riskScore: 0.7, confidence: 0.92, recommendation: 'Needs additional support' }
    ]
  });
});

// Enhanced AIOps endpoints
app.get('/api/teacher/students', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Alex Chen',
      email: 'alex.chen@university.edu',
      avatar: '👨‍💻',
      status: 'active',
      progress: 85,
      submissions: 12,
      lastActivity: new Date('2024-01-21T10:30:00'),
      riskScore: 0.15,
      predictedGrade: 'A',
      strengths: ['Security', 'Docker'],
      weaknesses: ['Networking'],
      githubPRs: 8,
      codeQuality: 92
    },
    {
      id: 2,
      name: 'Sarah Kim',
      email: 'sarah.kim@university.edu',
      avatar: '👩‍💻',
      status: 'active',
      progress: 72,
      submissions: 10,
      lastActivity: new Date('2024-01-21T09:15:00'),
      riskScore: 0.35,
      predictedGrade: 'B+',
      strengths: ['Kubernetes', 'Problem Solving'],
      weaknesses: ['Resource Management'],
      githubPRs: 6,
      codeQuality: 78
    }
  ]);
});

app.get('/api/teacher/alerts', (req, res) => {
  res.json([
    {
      id: 1,
      type: 'performance',
      severity: 'high',
      studentName: 'Mike Johnson',
      message: 'No submissions for 3 days, risk score increased to 72%',
      recommendation: 'Schedule immediate check-in meeting',
      timestamp: new Date('2024-01-21T11:00:00')
    },
    {
      id: 2,
      type: 'engagement',
      severity: 'high',
      studentName: 'David Wilson',
      message: 'Inactive for 6 days, predicted grade dropped to D+',
      recommendation: 'Contact student and provide additional support',
      timestamp: new Date('2024-01-21T10:30:00')
    }
  ]);
});

app.get('/api/ai-feedback/detailed', (req, res) => {
  res.json([
    {
      id: 1,
      studentName: 'Alex Chen',
      submission: 'Docker Security Lab',
      aiScore: 92,
      feedback: 'Excellent implementation of container security best practices. Consider adding network policies for enhanced security.',
      suggestions: [
        'Add resource limits to prevent container resource exhaustion',
        'Implement proper secret management using Kubernetes secrets',
        'Consider using distroless images for smaller attack surface'
      ],
      codeIssues: [
        { line: 15, severity: 'warning', message: 'Consider using specific version tags instead of latest' },
        { line: 23, severity: 'info', message: 'Good use of multi-stage builds for optimization' }
      ],
      timestamp: new Date('2024-01-21T10:30:00'),
      category: 'security'
    }
  ]);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Send initial data
  socket.emit('dashboard:initial', mockData.dashboard);
  socket.emit('leaderboard:update', mockData.leaderboard);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Simulate real-time updates
setInterval(() => {
  // Update mock data with random changes
  mockData.dashboard.activeUsers = Math.floor(Math.random() * 20) + 80;
  mockData.dashboard.totalSubmissions += Math.floor(Math.random() * 3);
  
  // Update leaderboard with small point changes
  mockData.leaderboard.forEach(user => {
    const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
    user.points += change;
    user.change = change > 0 ? `+${change}` : `${change}`;
  });
  
  // Sort leaderboard by points
  mockData.leaderboard.sort((a, b) => b.points - a.points);
  mockData.leaderboard.forEach((user, index) => {
    user.rank = index + 1;
  });
  
  // Emit updates to all connected clients
  io.emit('dashboard:update', mockData.dashboard);
  io.emit('leaderboard:update', mockData.leaderboard);
  
  // Occasionally emit achievement notifications
  if (Math.random() < 0.1) { // 10% chance
    const achievements = ['Code Ninja', 'Bug Hunter', 'Speed Demon', 'Team Player', 'Innovation Master'];
    const randomAchievement = achievements[Math.floor(Math.random() * achievements.length)];
    const randomUser = mockData.users[Math.floor(Math.random() * mockData.users.length)];
    
    io.emit('achievement:unlocked', {
      user: randomUser.name,
      achievement: randomAchievement,
      timestamp: new Date()
    });
  }
}, 5000); // Update every 5 seconds

// Start server
server.listen(port, () => {
  console.log(`🚀 GamifyX API Server running on http://localhost:${port}`);
  console.log(`📊 Dashboard data available at http://localhost:${port}/api/dashboard/stats`);
  console.log(`🏆 Leaderboard available at http://localhost:${port}/api/leaderboard`);
  console.log(`🔌 WebSocket server running for real-time updates`);
  console.log(`✅ Health check at http://localhost:${port}/health`);
});