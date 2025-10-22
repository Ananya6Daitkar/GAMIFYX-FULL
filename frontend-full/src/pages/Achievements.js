import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './Achievements.css';

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await axios.get('/api/achievements');
        
        // Expanded achievement data
        const allAchievements = [
          ...response.data,
          { id: 4, name: 'Speed Demon', description: 'Complete 5 challenges in under 30 minutes', icon: '⚡', rarity: 'rare', category: 'performance', unlocked: true, progress: 100 },
          { id: 5, name: 'Team Player', description: 'Collaborate on 10 team projects', icon: '🤝', rarity: 'common', category: 'collaboration', unlocked: true, progress: 100 },
          { id: 6, name: 'Innovation Master', description: 'Create 3 original solutions', icon: '💡', rarity: 'epic', category: 'creativity', unlocked: false, progress: 67 },
          { id: 7, name: 'Security Expert', description: 'Complete all security challenges', icon: '🔒', rarity: 'legendary', category: 'security', unlocked: false, progress: 45 },
          { id: 8, name: 'Docker Ninja', description: 'Master Docker containerization', icon: '🐳', rarity: 'rare', category: 'docker', unlocked: true, progress: 100 },
          { id: 9, name: 'Kubernetes Captain', description: 'Deploy 5 applications to Kubernetes', icon: '⚓', rarity: 'epic', category: 'kubernetes', unlocked: false, progress: 80 },
          { id: 10, name: 'CI/CD Champion', description: 'Set up 10 automated pipelines', icon: '🔄', rarity: 'rare', category: 'cicd', unlocked: false, progress: 30 },
          { id: 11, name: 'Monitoring Maestro', description: 'Configure comprehensive monitoring', icon: '📊', rarity: 'epic', category: 'monitoring', unlocked: false, progress: 60 },
          { id: 12, name: 'Cloud Architect', description: 'Design scalable cloud solutions', icon: '☁️', rarity: 'legendary', category: 'cloud', unlocked: false, progress: 25 },
        ];
        
        setAchievements(allAchievements);
        setUserAchievements(allAchievements.filter(a => a.unlocked));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return achievement.unlocked;
    if (filter === 'locked') return !achievement.unlocked;
    return achievement.rarity === filter;
  });

  const rarityColors = {
    common: '#808080',
    rare: '#0080FF',
    epic: '#8000FF',
    legendary: '#FFD700'
  };

  const categoryIcons = {
    performance: '⚡',
    collaboration: '🤝',
    creativity: '💡',
    security: '🔒',
    docker: '🐳',
    kubernetes: '⚓',
    cicd: '🔄',
    monitoring: '📊',
    cloud: '☁️'
  };

  if (loading) {
    return (
      <div className="achievements-loading">
        <div className="loading-spinner"></div>
        <p>Loading achievements...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="achievements-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="achievements-header">
        <h1 className="achievements-title">
          <span className="title-icon">🎯</span>
          Achievements
        </h1>
        <p className="achievements-subtitle">
          Unlock badges and track your learning milestones in the AIOps journey.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="achievements-stats">
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{userAchievements.length}</div>
            <div className="stat-label">Unlocked</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{achievements.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{Math.round((userAchievements.length / achievements.length) * 100)}%</div>
            <div className="stat-label">Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{userAchievements.filter(a => a.rarity === 'legendary').length}</div>
            <div className="stat-label">Legendary</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="achievements-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({achievements.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'unlocked' ? 'active' : ''}`}
          onClick={() => setFilter('unlocked')}
        >
          Unlocked ({userAchievements.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'locked' ? 'active' : ''}`}
          onClick={() => setFilter('locked')}
        >
          Locked ({achievements.length - userAchievements.length})
        </button>
        <button 
          className={`filter-btn rarity-common ${filter === 'common' ? 'active' : ''}`}
          onClick={() => setFilter('common')}
        >
          Common
        </button>
        <button 
          className={`filter-btn rarity-rare ${filter === 'rare' ? 'active' : ''}`}
          onClick={() => setFilter('rare')}
        >
          Rare
        </button>
        <button 
          className={`filter-btn rarity-epic ${filter === 'epic' ? 'active' : ''}`}
          onClick={() => setFilter('epic')}
        >
          Epic
        </button>
        <button 
          className={`filter-btn rarity-legendary ${filter === 'legendary' ? 'active' : ''}`}
          onClick={() => setFilter('legendary')}
        >
          Legendary
        </button>
      </div>

      {/* Achievements Grid */}
      <div className="achievements-grid">
        {filteredAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} rarity-${achievement.rarity}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <div className="achievement-header">
              <div className="achievement-icon">
                {achievement.unlocked ? achievement.icon : '🔒'}
              </div>
              <div className={`achievement-rarity rarity-${achievement.rarity}`}>
                {achievement.rarity}
              </div>
            </div>
            
            <div className="achievement-content">
              <h3 className="achievement-name">
                {achievement.unlocked ? achievement.name : '???'}
              </h3>
              <p className="achievement-description">
                {achievement.unlocked ? achievement.description : 'Complete more challenges to unlock this achievement'}
              </p>
            </div>

            {!achievement.unlocked && (
              <div className="achievement-progress">
                <div className="progress-bar">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${achievement.progress}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </div>
                <div className="progress-text">{achievement.progress}% Complete</div>
              </div>
            )}

            {achievement.unlocked && (
              <div className="achievement-unlocked">
                <span className="unlock-icon">✅</span>
                <span className="unlock-text">Unlocked!</span>
              </div>
            )}

            <div className="achievement-category">
              <span className="category-icon">{categoryIcons[achievement.category]}</span>
              <span className="category-name">{achievement.category}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Achievements */}
      <div className="recent-achievements">
        <h2>Recent Unlocks</h2>
        <div className="recent-list">
          {userAchievements.slice(0, 3).map((achievement, index) => (
            <motion.div
              key={achievement.id}
              className="recent-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="recent-icon">{achievement.icon}</div>
              <div className="recent-info">
                <div className="recent-name">{achievement.name}</div>
                <div className="recent-time">Unlocked recently</div>
              </div>
              <div className={`recent-rarity rarity-${achievement.rarity}`}>
                {achievement.rarity}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Achievements;