import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Box, Typography, Avatar, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';

interface SidebarProps {
  user?: {
    name?: string;
    role?: string;
    level?: number;
    points?: number;
    streak?: number;
    avatar?: string;
    badges?: string[];
    completedChallenges?: number;
  };
  collapsed?: boolean;
}

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

const Sidebar: React.FC<SidebarProps> = ({ user, collapsed = false }) => {
  const location = useLocation();

  const sidebarVariants = {
    expanded: {
      width: 280,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    collapsed: {
      width: 60,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: 0.1 }
    },
    collapsed: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      className="sidebar-content text-align-fix"
      variants={sidebarVariants}
      animate={collapsed ? "collapsed" : "expanded"}
      style={{
        padding: collapsed ? 'var(--spacing-sm)' : 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* User Profile Section */}
      {!collapsed && user && (
        <motion.div
          variants={contentVariants}
          animate={collapsed ? "collapsed" : "expanded"}
        >
          <Box
            sx={{
              textAlign: 'center',
              padding: 'var(--spacing-lg)',
              background: 'var(--color-surface-glass)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid rgba(0, 255, 255, 0.2)'
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                margin: '0 auto var(--spacing-md)',
                background: 'var(--gradient-button)',
                border: '3px solid rgba(0, 255, 255, 0.3)',
                fontSize: '2rem'
              }}
            >
              {user.avatar || '👤'}
            </Avatar>
            
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-xs)'
              }}
            >
              {user.name || 'User'}
            </Typography>
            
            <Typography
              variant="body2"
              sx={{
                color: 'var(--color-primary)',
                textTransform: 'capitalize',
                marginBottom: 'var(--spacing-md)'
              }}
            >
              {user.role || 'Student'}
            </Typography>

            {/* Stats */}
            <Box display="flex" justifyContent="space-around" mb={2}>
              <Box textAlign="center">
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {user.level || 0}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'var(--color-text-secondary)' }}
                >
                  Level
                </Typography>
              </Box>
              
              <Box textAlign="center">
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {user.streak || 0}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'var(--color-text-secondary)' }}
                >
                  Streak
                </Typography>
              </Box>
            </Box>

            {/* Progress Bar */}
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="caption">
                  Level {user.level || 0}
                </Typography>
                <Typography variant="caption">
                  {user.points || 0} XP
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={((user.points || 0) % 1000) / 10}
                sx={{
                  height: 8,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'var(--gradient-button)',
                    borderRadius: 'var(--radius-sm)'
                  }
                }}
              />
              
              <Typography
                variant="caption"
                sx={{
                  color: 'var(--color-text-secondary)',
                  display: 'block',
                  textAlign: 'center',
                  marginTop: 'var(--spacing-xs)'
                }}
              >
                {1000 - ((user.points || 0) % 1000)} XP to Level {(user.level || 0) + 1}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      )}

      {/* Collapsed user avatar */}
      {collapsed && user && (
        <Box display="flex" justifyContent="center">
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: 'var(--gradient-button)',
              border: '2px solid rgba(0, 255, 255, 0.3)'
            }}
          >
            {user.avatar || '👤'}
          </Avatar>
        </Box>
      )}

      {/* Navigation Menu */}
      <nav className="nav-container" style={{ flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
        {!collapsed && (
          <motion.div
            variants={contentVariants}
            animate={collapsed ? "collapsed" : "expanded"}
          >
            <Typography
              variant="overline"
              sx={{
                color: 'var(--color-text-secondary)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--letter-spacing-wider)',
                marginBottom: 'var(--spacing-md)',
                display: 'block',
                paddingLeft: 'var(--spacing-md)'
              }}
            >
              Navigation
            </Typography>
          </motion.div>
        )}
        
        {menuItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                color: 'var(--color-text-primary)',
                transition: 'all var(--transition-normal)',
                position: 'relative',
                justifyContent: collapsed ? 'center' : 'flex-start',
                minHeight: '48px'
              }}
            >
              <span 
                className="nav-icon"
                style={{ 
                  color: item.color,
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}
              >
                {item.icon}
              </span>
              
              {!collapsed && (
                <motion.span
                  className="nav-label"
                  variants={contentVariants}
                  animate={collapsed ? "collapsed" : "expanded"}
                  style={{
                    fontWeight: 'var(--font-weight-medium)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.label}
                </motion.span>
              )}
              
              {location.pathname === item.path && (
                <motion.div
                  className="nav-indicator"
                  layoutId="activeIndicator"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    backgroundColor: item.color,
                    borderRadius: '2px'
                  }}
                />
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Quick Stats */}
      {!collapsed && user && (
        <motion.div
          variants={contentVariants}
          animate={collapsed ? "collapsed" : "expanded"}
          style={{ marginTop: 'auto' }}
        >
          <Box
            sx={{
              padding: 'var(--spacing-md)',
              background: 'var(--color-surface-glass)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(0, 255, 255, 0.2)'
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: 'var(--color-text-secondary)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--letter-spacing-wider)',
                marginBottom: 'var(--spacing-md)',
                display: 'block'
              }}
            >
              Quick Stats
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <span style={{ fontSize: '1rem' }}>✅</span>
                <Box flex={1}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    {user.completedChallenges || 0}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-secondary)' }}
                  >
                    Completed
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <span style={{ fontSize: '1rem' }}>🔥</span>
                <Box flex={1}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    {user.streak || 0}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--color-text-secondary)' }}
                  >
                    Day Streak
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Sidebar;