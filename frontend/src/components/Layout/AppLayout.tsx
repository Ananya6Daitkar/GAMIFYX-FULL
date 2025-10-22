import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  sidebar, 
  header,
  title = "GamifyX Dashboard"
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.app-sidebar') && !target.closest('.sidebar-toggle')) {
          setSidebarOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, sidebarOpen]);

  // Auto-collapse sidebar on tablet and mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(false);
      setSidebarOpen(false);
    } else {
      // Auto-collapse on medium screens for better space utilization
      const isTablet = window.innerWidth < 1200;
      setSidebarCollapsed(isTablet);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Header */}
      <header className="app-header">
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton
            className="sidebar-toggle"
            onClick={toggleSidebar}
            sx={{ 
              color: 'var(--color-primary)',
              '&:hover': {
                backgroundColor: 'var(--color-surface-glow)'
              }
            }}
          >
            {isMobile && sidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontFamily: 'var(--font-family-primary)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              letterSpacing: 'var(--letter-spacing-wide)',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
            }}
          >
            {title}
          </Typography>
        </Box>

        {header && (
          <Box display="flex" alignItems="center" gap={2}>
            {header}
          </Box>
        )}
      </header>

      {/* Sidebar */}
      {sidebar && (
        <>
          {/* Mobile overlay */}
          {isMobile && (
            <div 
              className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar content */}
          <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobile && sidebarOpen ? 'open' : ''}`}>
            <div className="text-align-fix">
              {sidebar}
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="app-main no-horizontal-scroll">
        <div className="content-container content-flow">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;