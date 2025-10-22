import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard', color: '#00FFFF' },
  { path: '/submissions', icon: '📝', label: 'Submissions', color: '#FF00FF' },
  { path: '/leaderboard', icon: '🏆', label: 'Leaderboard', color: '#FFD700' },
  { path: '/achievements', icon: '🎯', label: 'Achievements', color: '#00FF80' },
  { path: '/competitions', icon: '⚔️', label: 'Competitions', color: '#FF6B6B' },
  { path: '/ai-feedback', icon: '🤖', label: 'AI Feedback', color: '#8000FF' },
  { path: '/analytics', icon: '📈', label: 'Analytics', color: '#FFA500' },
  { path: '/profile', icon: '👤', label: 'Profile', color: '#00BFFF' },
  { path: '/teacher', icon: '👨‍🏫', label: 'Teacher Hub', color: '#32CD32' },
  { path: '/settings', icon: '⚙️', label: 'Settings', color: '#808080' },
];

const Sidebar = ({ user, isOpen, onClose }) => {
  const location = useLocation();

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: -280,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const itemVariants = {
    open: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      opacity: 0,
      x: -20
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className="sidebar"
        data-open={isOpen}
        variants={sidebarVariants}
        animate={isOpen ? "open" : "closed"}
        initial="closed"
      >
        <div className="sidebar-content">
          {/* User Profile Section */}
          <motion.div 
            className="sidebar-profile"
            variants={itemVariants}
          >
            <div className="profile-avatar">
              {user?.avatar || '👤'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{user?.name}</h3>
              <p className="profile-role">{user?.role}</p>
              <div className="profile-stats">
                <div className="profile-stat">
                  <span className="stat-value">{user?.level}</span>
                  <span className="stat-label">Level</span>
                </div>
                <div className="profile-stat">
                  <span className="stat-value">{user?.streak}</span>
                  <span className="stat-label">Streak</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <motion.div 
            className="level-progress"
            variants={itemVariants}
          >
            <div className="progress-info">
              <span>Level {user?.level}</span>
              <span>{user?.points} XP</span>
            </div>
            <div className="progress-bar">
              <motion.div 
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(user?.points % 1000) / 10}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <div className="progress-next">
              {1000 - (user?.points % 1000)} XP to Level {(user?.level || 0) + 1}
            </div>
          </motion.div>

          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            <motion.div variants={itemVariants}>
              <h4 className="nav-section-title">Navigation</h4>
            </motion.div>
            
            {menuItems.map((item, index) => (
              <motion.div
                key={item.path}
                variants={itemVariants}
                transition={{ delay: index * 0.1 }}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => window.innerWidth <= 768 && onClose()}
                >
                  <span 
                    className="nav-icon"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {location.pathname === item.path && (
                    <motion.div
                      className="nav-indicator"
                      layoutId="activeIndicator"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </NavLink>
              </motion.div>
            ))}
          </nav>

          {/* Recent Achievements */}
          <motion.div 
            className="sidebar-achievements"
            variants={itemVariants}
          >
            <h4 className="section-title">Recent Badges</h4>
            <div className="achievement-list">
              {user?.badges?.slice(0, 3).map((badge, index) => (
                <div key={index} className="achievement-item">
                  <span className="achievement-icon">🏆</span>
                  <span className="achievement-name">{badge}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            className="sidebar-stats"
            variants={itemVariants}
          >
            <h4 className="section-title">Quick Stats</h4>
            <div className="quick-stats">
              <div className="quick-stat">
                <span className="quick-stat-icon">✅</span>
                <div className="quick-stat-info">
                  <span className="quick-stat-value">{user?.completedChallenges}</span>
                  <span className="quick-stat-label">Completed</span>
                </div>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-icon">🔥</span>
                <div className="quick-stat-info">
                  <span className="quick-stat-value">{user?.streak}</span>
                  <span className="quick-stat-label">Day Streak</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;