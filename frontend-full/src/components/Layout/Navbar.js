import React from 'react';
import { motion } from 'framer-motion';
import './Navbar.css';

const Navbar = ({ user, connected, onMenuClick }) => {
  return (
    <motion.nav 
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="navbar-content">
        <div className="navbar-left">
          <button className="menu-button" onClick={onMenuClick}>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
          </button>
          
          <div className="logo">
            <span className="logo-icon">🎮</span>
            <span className="logo-text text-gradient">GamifyX</span>
          </div>
        </div>
        
        <div className="navbar-center">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search challenges, users, achievements..." 
              className="search-input"
            />
            <button className="search-button">🔍</button>
          </div>
        </div>
        
        <div className="navbar-right">
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{connected ? 'Live' : 'Offline'}</span>
          </div>
          
          <div className="user-info">
            <div className="user-avatar">{user?.avatar || '👤'}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-level">Level {user?.level}</div>
            </div>
          </div>
          
          <div className="user-stats">
            <div className="stat">
              <span className="stat-value">{user?.points}</span>
              <span className="stat-label">XP</span>
            </div>
            <div className="stat">
              <span className="stat-value">#{user?.rank}</span>
              <span className="stat-label">Rank</span>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;