import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'user-service',
    version: '1.0.0'
  });
});

// Mock user endpoints
app.get('/profile', (req, res) => {
  res.json({
    id: 'user-123',
    username: 'demo-user',
    email: 'demo@example.com',
    roles: ['user', 'developer'],
    mfaEnabled: true,
    lastLogin: new Date().toISOString()
  });
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username && password) {
    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: 'user-123',
        username: username,
        roles: ['user']
      },
      mfaRequired: false
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }
});

app.post('/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (username && email && password) {
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: 'user-' + Date.now(),
        username: username,
        email: email
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username, email, and password required'
    });
  }
});

app.get('/permissions/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  res.json({
    userId: userId,
    permissions: [
      'read:profile',
      'write:profile',
      'read:dashboard',
      'execute:tasks'
    ],
    roles: ['user', 'developer']
  });
});

app.listen(PORT, () => {
  console.log(`👤 User Service running on port ${PORT}`);
  console.log(`🔐 Auth: http://localhost:${PORT}/auth/login`);
  console.log(`👥 Profile: http://localhost:${PORT}/profile`);
  console.log(`🔑 Permissions: http://localhost:${PORT}/permissions/user/:userId`);
});