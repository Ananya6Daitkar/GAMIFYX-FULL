import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  // LinearProgress,
  // Chip,
  Avatar,
  IconButton,
  // Badge,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  EmojiEvents,
  School,
  // Notifications,
  Refresh,
  Timeline,
  Leaderboard,
  Assignment,
  EmojiEventsOutlined
} from '@mui/icons-material';

// Import components
import ProgressOverview from '../components/dashboard/ProgressOverview';
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget';
import BadgeShowcase from '../components/dashboard/BadgeShowcase';
import AchievementTimeline from '../components/dashboard/AchievementTimeline';
import SubmissionHistory from '../components/dashboard/SubmissionHistory';
import PerformanceCharts from '../components/dashboard/PerformanceCharts';
import NotificationCenter from '../components/dashboard/NotificationCenter';
import RealTimeUpdates from '../components/dashboard/RealTimeUpdates';
import PerformanceMonitor from '../components/dashboard/PerformanceMonitor';
import CompetitionProfileSection from '../components/profile/CompetitionProfileSection';
import ExternalCompetitionBadges from '../components/profile/ExternalCompetitionBadges';
import CompetitionProgressDashboard from '../components/competition/CompetitionProgressDashboard';

// Import services and types
import { apiService } from '../services/api';
import { webSocketService } from '../services/websocket';
import {
  DashboardState,
  GameEvent,
  NotificationMessage,
  // User,
  // UserGameProfile
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    user: null,
    profile: null,
    badges: [],
    achievements: [],
    recentSubmissions: [],
    leaderboard: [],
    notifications: [],
    performanceData: [],
    progressData: [],
    riskScore: null,
    loading: true,
    error: null
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Mock user ID - in real app this would come from auth context
  const userId = 'user-123';

  useEffect(() => {
    loadDashboardData();
    setupWebSocketListeners();
    
    // Request notification permission for browser notifications
    webSocketService.requestNotificationPermission();
    
    return () => {
      webSocketService.off('game_event', handleGameEvent);
      webSocketService.off('notification', handleNotification);
    };
  }, []);

  const loadDashboardData = async () => {
    setDashboardState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load all dashboard data in parallel
      const [
        profileResponse,
        badgesResponse,
        achievementsResponse,
        submissionsResponse,
        leaderboardResponse,
        notificationsResponse,
        performanceResponse,
        progressResponse,
        riskResponse
      ] = await Promise.allSettled([
        apiService.getUserProfile(userId),
        apiService.getUserBadges(userId),
        apiService.getUserAchievements(userId),
        apiService.getUserSubmissions(userId, 10),
        apiService.getGlobalLeaderboard('all_time', 20),
        apiService.getUserNotifications(userId, 10),
        apiService.getUserPerformanceData(userId, '30d'),
        apiService.getUserProgress(userId, '30d'),
        apiService.getUserRiskScore(userId)
      ]);

      // Process successful responses
      const newState: Partial<DashboardState> = {
        loading: false,
        profile: profileResponse.status === 'fulfilled' ? profileResponse.value.data : null,
        badges: badgesResponse.status === 'fulfilled' ? badgesResponse.value.data.badges : [],
        achievements: achievementsResponse.status === 'fulfilled' ? achievementsResponse.value.data.achievements : [],
        recentSubmissions: submissionsResponse.status === 'fulfilled' ? submissionsResponse.value.data : [],
        leaderboard: leaderboardResponse.status === 'fulfilled' ? leaderboardResponse.value.data.leaderboard : [],
        notifications: notificationsResponse.status === 'fulfilled' ? notificationsResponse.value.data.notifications : [],
        performanceData: performanceResponse.status === 'fulfilled' ? performanceResponse.value.data : [],
        progressData: progressResponse.status === 'fulfilled' ? progressResponse.value.data.dailyProgress : [],
        riskScore: riskResponse.status === 'fulfilled' ? riskResponse.value.data : null
      };

      setDashboardState(prev => ({ ...prev, ...newState }));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data. Please try again.'
      }));
    }
  };

  const setupWebSocketListeners = () => {
    webSocketService.on('game_event', handleGameEvent);
    webSocketService.on('notification', handleNotification);
  };

  const handleGameEvent = (event: GameEvent) => {
    console.log('Game event received:', event);
    
    // Show notification for the event
    let message = '';
    let severity: 'success' | 'info' | 'warning' | 'error' = 'info';

    switch (event.type) {
      case 'badge_earned':
        message = `🏆 You earned the "${event.data.name}" badge!`;
        severity = 'success';
        break;
      case 'achievement_unlocked':
        message = `🎉 Achievement unlocked: "${event.data.name}"!`;
        severity = 'success';
        break;
      case 'level_up':
        message = `🚀 Level up! You reached level ${event.data.newLevel}!`;
        severity = 'success';
        break;
      case 'points_awarded':
        message = `💎 You earned ${event.data.points} points!`;
        severity = 'info';
        break;
      case 'streak_updated':
        message = `🔥 ${event.data.milestone}`;
        severity = 'info';
        break;
      case 'rank_changed':
        message = `📈 Your leaderboard rank changed!`;
        severity = 'info';
        break;
    }

    if (message) {
      setSnackbar({ open: true, message, severity });
    }

    // Refresh relevant data
    if (['badge_earned', 'achievement_unlocked', 'level_up', 'points_awarded'].includes(event.type)) {
      loadDashboardData();
    }
  };

  const handleNotification = (notification: NotificationMessage) => {
    console.log('Notification received:', notification);
    
    // Add to notifications list
    setDashboardState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 9)]
    }));

    // Show snackbar
    setSnackbar({
      open: true,
      message: notification.message,
      severity: 'info'
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (dashboardState.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  if (dashboardState.error) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="error" gutterBottom>
          {dashboardState.error}
        </Typography>
        <IconButton onClick={handleRefresh} color="primary">
          <Refresh />
        </IconButton>
      </Box>
    );
  }

  const { profile, badges, achievements, recentSubmissions, leaderboard, notifications } = dashboardState;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back! 👋
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {profile ? `Level ${profile.level} • ${profile.totalPoints} points` : 'Loading...'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          <PerformanceMonitor componentName="StudentDashboard" />
          <NotificationCenter 
            notifications={notifications}
            onMarkAsRead={(ids) => apiService.markNotificationsAsRead(userId, ids)}
          />
          <IconButton onClick={handleRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Quick Stats */}
      <div className="dashboard-grid mb-4">
        <div className="grid-span-3">
          <Card className="h-100">
            <CardContent className="metric-container">
              <div className="metric-header">
                <div className="metric-label">Current Level</div>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <TrendingUp />
                </Avatar>
              </div>
              <div className="metric-value">{profile?.level || 0}</div>
            </CardContent>
          </Card>
        </div>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <EmojiEvents />
                </Avatar>
                <Box>
                  <Typography variant="h6">{badges.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Badges Earned
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <School />
                </Avatar>
                <Box>
                  <Typography variant="h6">{recentSubmissions.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submissions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Leaderboard />
                </Avatar>
                <Box>
                  <Typography variant="h6">#{profile?.leaderboardRank || 'N/A'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rank
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Timeline />} label="Progress" />
          <Tab icon={<Leaderboard />} label="Leaderboard" />
          <Tab icon={<EmojiEvents />} label="Badges & Achievements" />
          <Tab icon={<EmojiEventsOutlined />} label="Competitions" />
          <Tab icon={<Assignment />} label="Submissions" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <ProgressOverview profile={profile} progressData={dashboardState.progressData} />
            </Grid>
            <Grid item xs={12} lg={4}>
              <PerformanceCharts data={dashboardState.performanceData} />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <LeaderboardWidget 
            leaderboard={leaderboard}
            currentUserId={userId}
            onRefresh={handleRefresh}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <BadgeShowcase badges={badges} />
            </Grid>
            <Grid item xs={12} md={6}>
              <AchievementTimeline achievements={achievements} />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <CompetitionProgressDashboard 
                userId={userId}
                showCompact={false}
                maxParticipations={6}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <CompetitionProfileSection 
                userId={userId}
                showFullHistory={false}
                maxTimelineItems={10}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <ExternalCompetitionBadges 
                userId={userId}
                maxBadges={8}
                showVerificationStatus={true}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <SubmissionHistory 
            submissions={recentSubmissions}
            onViewDetails={(id) => console.log('View submission:', id)}
          />
        </TabPanel>
      </Paper>

      {/* Real-time Updates Component */}
      <RealTimeUpdates 
        isConnected={webSocketService.isConnected()}
        onReconnect={() => webSocketService.disconnect()}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentDashboard;