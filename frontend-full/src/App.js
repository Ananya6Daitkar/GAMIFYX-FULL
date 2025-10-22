import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

// Components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import LoadingScreen from './components/Common/LoadingScreen';
import NotificationSystem from './components/Common/NotificationSystem';

// Pages
import Dashboard from './pages/Dashboard';
import Submissions from './pages/Submissions';
import Leaderboard from './pages/Leaderboard';
import Achievements from './pages/Achievements';

import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import AIFeedback from './pages/AIFeedback';
import Competitions from './pages/Competitions';
import TeacherDashboard from './pages/TeacherDashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Styles
import './App.css';

// Store
import { useAppStore } from './store/appStore';

function App() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { 
    user, 
    setUser, 
    connected, 
    setConnected, 
    notifications, 
    addNotification 
  } = useAppStore();

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Set mock user for demo
        setUser({
          id: 1,
          name: 'Alex Chen',
          email: 'alex.chen@gamifyx.com',
          role: 'student',
          level: 12,
          points: 2450,
          badges: ['Code Ninja', 'Bug Hunter', 'Speed Demon'],
          avatar: '👨‍💻',
          joinDate: '2024-01-15',
          streak: 15,
          completedChallenges: 47,
          rank: 3
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoading(false);
      }
    };

    initializeApp();
  }, [setUser]);

  useEffect(() => {
    if (!loading && user) {
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

      socket.on('achievement:unlocked', (data) => {
        addNotification({
          id: Date.now(),
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: `${data.user} unlocked ${data.achievement}!`,
          timestamp: data.timestamp,
          icon: '🏆'
        });
      });

      socket.on('leaderboard:update', (data) => {
        // Handle leaderboard updates
        console.log('Leaderboard updated:', data);
      });

      socket.on('system:alert', (data) => {
        addNotification({
          id: Date.now(),
          type: data.type,
          title: 'System Alert',
          message: data.message,
          timestamp: new Date(),
          icon: data.type === 'warning' ? '⚠️' : 'ℹ️'
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [loading, user, setConnected, addNotification]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <Navbar 
        user={user} 
        connected={connected}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="app-content">
        <Sidebar 
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="main-content">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/submissions" element={<Submissions />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/ai-feedback" element={<AIFeedback />} />
              <Route path="/competitions" element={<Competitions />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
      
      <NotificationSystem notifications={notifications} />
    </div>
  );
}

export default App;