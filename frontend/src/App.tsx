import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, IconButton } from '@mui/material';
import { Notifications, AccountCircle } from '@mui/icons-material';
import { cyberpunkTheme } from './theme/cyberpunkTheme';
import './styles/index.css';
import { AppLayout, Sidebar } from './components/Layout';
import GamifyXDashboard from './components/gamifyx/GamifyXDashboard';
import TestDashboard from './components/gamifyx/TestDashboard';
import SimpleDashboard from './components/gamifyx/SimpleDashboard';
import ErrorBoundary from './components/ErrorBoundary';

import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Login from './pages/Login';

// Mock user data - in real app this would come from auth context
const mockUser = {
  name: 'Alex Chen',
  role: 'student',
  level: 8,
  points: 2450,
  streak: 12,
  avatar: '🚀',
  badges: ['First Steps', 'Code Master', 'Team Player'],
  completedChallenges: 24
};

function App(): JSX.Element {
  const location = useLocation();
  
  // Don't show layout on login page
  const isLoginPage = location.pathname === '/login';
  
  // Header content
  const headerContent = (
    <Box display="flex" alignItems="center" gap={1}>
      <IconButton
        sx={{ 
          color: 'var(--color-primary)',
          '&:hover': { backgroundColor: 'var(--color-surface-glow)' }
        }}
      >
        <Notifications />
      </IconButton>
      <IconButton
        sx={{ 
          color: 'var(--color-primary)',
          '&:hover': { backgroundColor: 'var(--color-surface-glow)' }
        }}
      >
        <AccountCircle />
      </IconButton>
    </Box>
  );

  const content = (
    <Routes>
      <Route path="/" element={<GamifyXDashboard />} />
      <Route path="/gamifyx" element={<GamifyXDashboard />} />
      <Route path="/test" element={<TestDashboard />} />
      <Route path="/simple" element={<SimpleDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/teacher" element={
        <ErrorBoundary>
          <TeacherDashboard />
        </ErrorBoundary>
      } />
    </Routes>
  );

  return (
    <ThemeProvider theme={cyberpunkTheme}>
      <CssBaseline />
      {isLoginPage ? (
        content
      ) : (
        <AppLayout
          title="GamifyX"
          header={headerContent}
          sidebar={<Sidebar user={mockUser} />}
        >
          {content}
        </AppLayout>
      )}
    </ThemeProvider>
  );
}

export default App;