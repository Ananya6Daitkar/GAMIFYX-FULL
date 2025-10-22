import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get('/api/leaderboard');
        // Expand the leaderboard with more realistic data
        const expandedData = [
          ...response.data,
          { rank: 4, name: 'David Wilson', points: 1850, change: '+15', avatar: '👨‍💻', level: 8, badges: 3 },
          { rank: 5, name: 'Lisa Zhang', points: 1720, change: '+22', avatar: '👩‍💻', level: 7, badges: 4 },
          { rank: 6, name: 'James Rodriguez', points: 1650, change: '-5', avatar: '👨‍🔬', level: 7, badges: 2 },
          { rank: 7, name: 'Maria Garcia', points: 1580, change: '+8', avatar: '👩‍🔬', level: 6, badges: 3 },
          { rank: 8, name: 'Kevin Park', points: 1520, change: '+12', avatar: '👨‍💼', level: 6, badges: 2 },
          { rank: 9, name: 'Sophie Turner', points: 1480, change: '-3', avatar: '👩‍💼', level: 6, badges: 4 },
          { rank: 10, name: 'Ryan Mitchell', points: 1420, change: '+18', avatar: '👨‍🎓', level: 5, badges: 1 },
        ];
        setLeaderboard(expandedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredLeaderboard = leaderboard.filter(user => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'students') return user.level <= 5;
    if (categoryFilter === 'advanced') return user.level > 5;
    return true;
  });

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="leaderboard-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">
          <span className="title-icon">🏆</span>
          Leaderboard
        </h1>
        <p className="leaderboard-subtitle">
          Compete with other learners and climb the ranks in the AIOps arena.
        </p>
      </div>

      {/* Filters */}
      <div className="leaderboard-filters">
        <div className="filter-group">
          <label>Time Period:</label>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Users</option>
            <option value="students">Students (Level 1-5)</option>
            <option value="advanced">Advanced (Level 6+)</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="podium">
        {filteredLeaderboard.slice(0, 3).map((user, index) => (
          <motion.div
            key={user.rank}
            className={`podium-position position-${index + 1}`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <div className="podium-rank">#{user.rank}</div>
            <div className="podium-avatar">{user.avatar}</div>
            <div className="podium-name">{user.name}</div>
            <div className="podium-points">{user.points} XP</div>
            <div className={`podium-change ${user.change.startsWith('+') ? 'positive' : 'negative'}`}>
              {user.change}
            </div>
            <div className="podium-level">Level {user.level}</div>
          </motion.div>
        ))}
      </div>

      {/* Full Leaderboard */}
      <div className="leaderboard-list">
        <div className="leaderboard-header-row">
          <div className="header-rank">Rank</div>
          <div className="header-user">User</div>
          <div className="header-level">Level</div>
          <div className="header-points">Points</div>
          <div className="header-badges">Badges</div>
          <div className="header-change">Change</div>
        </div>
        
        {filteredLeaderboard.map((user, index) => (
          <motion.div
            key={user.rank}
            className={`leaderboard-row ${index < 3 ? `top-${index + 1}` : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, x: 10 }}
          >
            <div className="row-rank">
              <span className="rank-number">#{user.rank}</span>
              {index === 0 && <span className="crown">👑</span>}
            </div>
            <div className="row-user">
              <div className="user-avatar">{user.avatar}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-title">
                  {user.level <= 3 ? 'Novice' : 
                   user.level <= 6 ? 'Intermediate' : 
                   user.level <= 8 ? 'Advanced' : 'Expert'}
                </div>
              </div>
            </div>
            <div className="row-level">
              <div className="level-badge">L{user.level}</div>
            </div>
            <div className="row-points">
              <span className="points-value">{user.points}</span>
              <span className="points-label">XP</span>
            </div>
            <div className="row-badges">
              <span className="badge-count">{user.badges}</span>
              <span className="badge-icon">🏆</span>
            </div>
            <div className={`row-change ${user.change.startsWith('+') ? 'positive' : 'negative'}`}>
              {user.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="leaderboard-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{filteredLeaderboard.length}</div>
            <div className="stat-label">Total Competitors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">
              {Math.round(filteredLeaderboard.reduce((sum, user) => sum + user.points, 0) / filteredLeaderboard.length)}
            </div>
            <div className="stat-label">Average XP</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">
              {filteredLeaderboard.filter(user => user.change.startsWith('+')).length}
            </div>
            <div className="stat-label">Rising Stars</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Leaderboard;