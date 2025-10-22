import React from 'react';
import { motion } from 'framer-motion';
import './Login.css';

const Login = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="login-header">
            <h1 className="login-title text-gradient">🎮 GamifyX</h1>
            <p className="login-subtitle">Enter the AIOps Learning Arena</p>
          </div>
          
          <div className="login-form">
            <button className="login-btn github-btn">
              <span className="btn-icon">🚀</span>
              Continue with GitHub
            </button>
            <button className="login-btn demo-btn">
              <span className="btn-icon">✨</span>
              Enter Demo Mode
            </button>
          </div>
          
          <div className="login-features">
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>AI-Powered Learning</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <span>Real-time Competition</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <span>Advanced Analytics</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;