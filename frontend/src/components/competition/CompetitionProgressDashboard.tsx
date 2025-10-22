import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Fade
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Flag as FlagIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import CompetitionProgressWidget from './CompetitionProgressWidget';
import CompetitionProgressCard from './CompetitionProgressCard';
import MilestoneTracker from './MilestoneTracker';
import { Participation, Milestone } from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

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
      id={`progress-tabpanel-${index}`}
      aria-labelledby={`progress-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface CompetitionProgressDashboardProps {
  userId: string;
  showCompact?: boolean;
  maxParticipations?: number;
}

const CompetitionProgressDashboard: React.FC<CompetitionProgressDashboardProps> = ({
  userId,
  showCompact = false,
  maxParticipations = 6
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipation, setSelectedParticipation] = useState<string | null>(null);
  const [achievementNotification, setAchievementNotification] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadParticipations();
    
    // Set up auto-refresh
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadParticipations, 60000); // Refresh every minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId, autoRefresh]);

  const loadParticipations = async () => {
    try {
      setError(null);
      const participationsData = await competitionApi.getUserParticipations();
      
      // Filter active and recently completed participations
      const relevantParticipations = participationsData
        .filter(p => p.status === 'active' || p.status === 'completed')
        .sort((a, b) => {
          // Sort by status (active first) then by registration date
          if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
          }
          return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
        })
        .slice(0, maxParticipations);

      setParticipations(relevantParticipations);
      
      // Auto-select first participation if none selected
      if (!selectedParticipation && relevantParticipations.length > 0) {
        setSelectedParticipation(relevantParticipations[0].id);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load participations');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleParticipationSelect = (participationId: string) => {
    setSelectedParticipation(participationId);
    setTabValue(0); // Switch to overview tab
  };

  const handleMilestoneAchieved = (milestone: Milestone) => {
    setAchievementNotification({
      open: true,
      message: `🎉 Milestone achieved: ${milestone.name}! (+${milestone.points} points)`
    });
  };

  const handleCloseNotification = () => {
    setAchievementNotification({ open: false, message: '' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DashboardIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Competition Progress Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading your competition progress...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <Button onClick={loadParticipations} variant="outlined">
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (participations.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DashboardIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Competition Progress Dashboard
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No active competitions found
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Join a competition to start tracking your progress!
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.open('/competitions', '_blank')}
              sx={{ mt: 2 }}
            >
              Browse Competitions
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DashboardIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                🚀 Competition Progress Dashboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Auto-refresh">
                <IconButton 
                  size="small"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  sx={{ color: autoRefresh ? theme.palette.success.main : theme.palette.grey[500] }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh now">
                <IconButton size="small" onClick={loadParticipations}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Expand view">
                <IconButton size="small">
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Competition Cards Grid */}
          {!showCompact && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                📊 Active Competitions
              </Typography>
              <Grid container spacing={2}>
                {participations.map((participation) => (
                  <Grid item xs={12} sm={6} md={4} key={participation.id}>
                    <Fade in timeout={500}>
                      <div>
                        <CompetitionProgressCard
                          participationId={participation.id}
                          onClick={() => handleParticipationSelect(participation.id)}
                          showDetails={true}
                          animated={true}
                        />
                      </div>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Detailed Progress View */}
          {selectedParticipation && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                🎯 Detailed Progress
              </Typography>
              
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                <Tab icon={<DashboardIcon />} label="Overview" />
                <Tab icon={<TimelineIcon />} label="Requirements" />
                <Tab icon={<FlagIcon />} label="Milestones" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <CompetitionProgressWidget
                  participationId={selectedParticipation}
                  showMilestones={true}
                  showRequirements={true}
                  compact={showCompact}
                  animated={true}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <CompetitionProgressWidget
                  participationId={selectedParticipation}
                  showMilestones={false}
                  showRequirements={true}
                  compact={false}
                  animated={true}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <MilestoneTracker
                  participationId={selectedParticipation}
                  showCompact={showCompact}
                  maxMilestones={showCompact ? 3 : 10}
                  autoRefresh={autoRefresh}
                  onMilestoneAchieved={handleMilestoneAchieved}
                />
              </TabPanel>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Achievement Notification */}
      <Snackbar
        open={achievementNotification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity="success"
          sx={{ 
            backgroundColor: theme.palette.success.main,
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' }
          }}
        >
          {achievementNotification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CompetitionProgressDashboard;