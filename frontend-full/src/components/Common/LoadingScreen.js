import React from 'react';
import { motion } from 'framer-motion';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <motion.div
          className="loading-logo"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="loading-icon">🎮</span>
          <h1 className="loading-title text-gradient">GamifyX</h1>
        </motion.div>
        
        <motion.div
          className="loading-spinner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </motion.div>
        
        <motion.p
          className="loading-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Initializing AIOps Learning Platform...
        </motion.p>
        
        <motion.div
          className="loading-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <span>AI-Powered Feedback</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <span>Real-time Leaderboards</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Live Analytics</span>
          </div>
        </motion.div>
      </div>
      
      <div className="loading-background">
        <div className="bg-particle"></div>
        <div className="bg-particle"></div>
        <div className="bg-particle"></div>
        <div className="bg-particle"></div>
        <div className="bg-particle"></div>
      </div>
    </div>
  );
};

export default LoadingScreen;