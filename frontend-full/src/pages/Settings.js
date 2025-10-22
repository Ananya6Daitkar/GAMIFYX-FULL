import React from 'react';
import { motion } from 'framer-motion';

const Settings = () => {
  return (
    <motion.div 
      className="page-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1>⚙️ Settings</h1>
      <p>Customize your learning experience and preferences.</p>
      <div className="coming-soon">
        <h2>🚧 Coming Soon</h2>
        <p>Comprehensive settings panel with theme customization and preferences.</p>
      </div>
    </motion.div>
  );
};

export default Settings;