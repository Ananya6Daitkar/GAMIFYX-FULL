import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'

// Layout Components
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'

// Dashboard Pages
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminDashboard from './pages/AdminDashboard'

// Feature Pages
import CompetitionDashboard from './pages/CompetitionDashboard'
import SubmissionCenter from './pages/SubmissionCenter'
import AIFeedback from './pages/AIFeedback'
import Analytics from './pages/Analytics'
import Gamification from './pages/Gamification'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

// Auth
import Login from './pages/Login'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useWebSocket } from './hooks/useWebSocket'

// Types
interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  avatar?: string
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Initialize WebSocket connection
  useWebSocket('ws://localhost:8080')

  useEffect(() => {
    // Simulate authentication check
    const initAuth = async () => {
      try {
        // For demo purposes, set a default user
        const demoUser: User = {
          id: '1',
          name: 'Alex Chen',
          email: 'alex.chen@gamifyx.com',
          role: 'student',
          avatar: '/avatars/alex-chen.jpg'
        }
        
        setUser(demoUser)
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <CircularProgress
            size={60}
            sx={{
              color: '#00d4ff',
              filter: 'drop-shadow(0 0 10px #00d4ff)',
            }}
          />
        </motion.div>
      </Box>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={handleLogout} onToggleSidebar={toggleSidebar} />
      
      <Sidebar 
        open={sidebarOpen} 
        userRole={user.role} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: '64px',
          marginLeft: sidebarOpen ? '280px' : '0px',
          transition: 'margin-left 0.3s ease',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          minHeight: 'calc(100vh - 64px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cyberpunk background effects */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 0, 128, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(0, 255, 136, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
          }}
        />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Routes>
              {/* Dashboard Routes */}
              <Route 
                path="/" 
                element={
                  user.role === 'student' ? <Navigate to="/student" /> :
                  user.role === 'teacher' ? <Navigate to="/teacher" /> :
                  <Navigate to="/admin" />
                } 
              />
              <Route path="/student" element={<StudentDashboard user={user} />} />
              <Route path="/teacher" element={<TeacherDashboard user={user} />} />
              <Route path="/admin" element={<AdminDashboard user={user} />} />
              
              {/* Feature Routes */}
              <Route path="/competitions" element={<CompetitionDashboard user={user} />} />
              <Route path="/submissions" element={<SubmissionCenter user={user} />} />
              <Route path="/ai-feedback" element={<AIFeedback user={user} />} />
              <Route path="/analytics" element={<Analytics user={user} />} />
              <Route path="/gamification" element={<Gamification user={user} />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="/settings" element={<Settings user={user} />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  )
}

export default App