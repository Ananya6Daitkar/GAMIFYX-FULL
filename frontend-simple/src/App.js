import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const [dashboardRes, leaderboardRes, achievementsRes, usersRes] = await Promise.all([
          axios.get('/api/dashboard/stats'),
          axios.get('/api/leaderboard'),
          axios.get('/api/achievements'),
          axios.get('/api/users')
        ]);

        setDashboardData(dashboardRes.data);
        setLeaderboard(leaderboardRes.data);
        setAchievements(achievementsRes.data);
        setUsers(usersRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Setup WebSocket connection
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    socket.on('dashboard:update', (data) => {
      setDashboardData(data);
    });

    socket.on('leaderboard:update', (data) => {
      setLeaderboard(data);
    });

    socket.on('achievement:unlocked', (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'achievement',
        message: `${data.user} unlocked ${data.achievement}!`,
        timestamp: data.timestamp
      }]);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== Date.now()));
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!dashboardData) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <h2>Loading GamifyX Platform...</h2>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">🎮 GamifyX</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '🟢 Live' : '🔴 Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notification => (
          <div key={notification.id} className="notification achievement-notification">
            🏆 {notification.message}
          </div>
        ))}
      </div>

      {/* Main Dashboard */}
      <main className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <div className="stat-value">{dashboardData.totalUsers}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>Active Users</h3>
              <div className="stat-value">{dashboardData.activeUsers}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Submissions</h3>
              <div className="stat-value">{dashboardData.totalSubmissions}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Avg Score</h3>
              <div className="stat-value">{dashboardData.averageScore}%</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Leaderboard */}
          <div className="panel leaderboard-panel">
            <h2>🏆 Leaderboard</h2>
            <div className="leaderboard">
              {leaderboard.map((user, index) => (
                <div key={user.rank} className={`leaderboard-item rank-${index + 1}`}>
                  <div className="rank">#{user.rank}</div>
                  <div className="user-info">
                    <div className="name">{user.name}</div>
                    <div className="points">{user.points} pts</div>
                  </div>
                  <div className={`change ${user.change.startsWith('+') ? 'positive' : 'negative'}`}>
                    {user.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="panel achievements-panel">
            <h2>🎯 Achievements</h2>
            <div className="achievements">
              {achievements.map(achievement => (
                <div key={achievement.id} className={`achievement-item rarity-${achievement.rarity}`}>
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-description">{achievement.description}</div>
                    <div className="achievement-rarity">{achievement.rarity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="panel health-panel">
            <h2>🔧 System Health</h2>
            <div className="health-status">
              <div className={`health-indicator ${dashboardData.systemHealth}`}>
                <div className="health-icon">
                  {dashboardData.systemHealth === 'excellent' ? '🟢' : 
                   dashboardData.systemHealth === 'good' ? '🟡' : '🔴'}
                </div>
                <div className="health-text">
                  Status: {dashboardData.systemHealth.toUpperCase()}
                </div>
              </div>
            </div>
            
            <div className="alerts">
              <h3>Recent Alerts</h3>
              {dashboardData.alerts.map(alert => (
                <div key={alert.id} className={`alert alert-${alert.type}`}>
                  <div className="alert-icon">
                    {alert.type === 'info' ? 'ℹ️' : 
                     alert.type === 'warning' ? '⚠️' : '🚨'}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;