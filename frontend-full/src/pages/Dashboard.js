import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardRes, leaderboardRes] = await Promise.all([
          axios.get('/api/dashboard/stats'),
          axios.get('/api/leaderboard')
        ]);

        setDashboardData(dashboardRes.data);
        setLeaderboard(leaderboardRes.data);
        
        // Mock recent activity data
        setRecentActivity([
          { id: 1, type: 'submission', user: 'Alex Chen', action: 'Completed Docker Security Lab', time: '2 minutes ago', icon: '✅' },
          { id: 2, type: 'achievement', user: 'Sarah Kim', action: 'Unlocked "Code Ninja" badge', time: '5 minutes ago', icon: '🏆' },
          { id: 3, type: 'competition', user: 'Mike Johnson', action: 'Joined Kubernetes Challenge', time: '10 minutes ago', icon: '⚔️' },
          { id: 4, type: 'feedback', user: 'Emma Davis', action: 'Received AI feedback on submission', time: '15 minutes ago', icon: '🤖' },
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // Set fallback data if API fails
        setDashboardData({
          activeUsers: 89,
          totalSubmissions: 342,
          averageScore: 78.5
        });
        
        setLeaderboard([
          { rank: 1, name: 'Carol Davis', points: 2194, change: '+50' },
          { rank: 2, name: 'Alice Johnson', points: 1721, change: '+25' },
          { rank: 3, name: 'Bob Smith', points: 1013, change: '-10' },
          { rank: 4, name: 'Emma Wilson', points: 892, change: '+15' },
          { rank: 5, name: 'Mike Chen', points: 756, change: '-5' }
        ]);
        
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mock chart data
  const performanceData = [
    { name: 'Mon', submissions: 12, completed: 10, score: 85 },
    { name: 'Tue', submissions: 15, completed: 13, score: 87 },
    { name: 'Wed', submissions: 18, completed: 16, score: 89 },
    { name: 'Thu', submissions: 14, completed: 12, score: 86 },
    { name: 'Fri', submissions: 20, completed: 18, score: 92 },
    { name: 'Sat', submissions: 16, completed: 15, score: 94 },
    { name: 'Sun', submissions: 22, completed: 20, score: 91 },
  ];

  const skillDistribution = [
    { name: 'Docker', value: 35, color: '#00FFFF' },
    { name: 'Kubernetes', value: 25, color: '#FF00FF' },
    { name: 'Security', value: 20, color: '#FFFF00' },
    { name: 'Monitoring', value: 15, color: '#00FF80' },
    { name: 'CI/CD', value: 5, color: '#FF6B6B' },
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <span className="title-icon">📊</span>
          Dashboard
        </h1>
        <p className="dashboard-subtitle">
          Welcome back! Here's your learning progress overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.02, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Active Learners</h3>
            <div className="stat-value">{dashboardData?.activeUsers || 0}</div>
            <div className="stat-change positive">+12% this week</div>
          </div>
        </motion.div>

        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.02, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>Total Submissions</h3>
            <div className="stat-value">{dashboardData?.totalSubmissions || 0}</div>
            <div className="stat-change positive">+8% this week</div>
          </div>
        </motion.div>

        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.02, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Average Score</h3>
            <div className="stat-value">{dashboardData?.averageScore || 0}%</div>
            <div className="stat-change positive">+3% this week</div>
          </div>
        </motion.div>

        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.02, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <h3>System Health</h3>
            <div className="stat-value health-excellent">Excellent</div>
            <div className="stat-change neutral">All systems operational</div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Performance Chart */}
        <motion.div 
          className="dashboard-card chart-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <h3>Weekly Performance</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#00FFFF' }}></span>
                Submissions
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#FF00FF' }}></span>
                Completed
              </span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#ffffff" />
                <YAxis stroke="#ffffff" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(0,255,255,0.3)',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="submissions" stroke="#00FFFF" strokeWidth={3} />
                <Line type="monotone" dataKey="completed" stroke="#FF00FF" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div 
          className="dashboard-card leaderboard-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h3>🏆 Top Performers</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="leaderboard-list">
            {leaderboard.slice(0, 5).map((user, index) => (
              <div key={user.rank} className={`leaderboard-item rank-${index + 1}`}>
                <div className="rank">#{user.rank}</div>
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-points">{user.points} XP</div>
                </div>
                <div className={`change ${user.change.startsWith('+') ? 'positive' : 'negative'}`}>
                  {user.change}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Skill Distribution */}
        <motion.div 
          className="dashboard-card chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h3>Skill Distribution</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={skillDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {skillDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          className="dashboard-card activity-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h3>Recent Activity</h3>
            <button className="refresh-btn">🔄</button>
          </div>
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>{activity.user}</strong> {activity.action}
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;