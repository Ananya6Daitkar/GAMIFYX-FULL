import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fade,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
  Leaderboard as LeaderboardIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { 
  Competition, 
  CompetitionDashboardData, 
  CompetitionFilters, 
  CompetitionType, 
  CompetitionStatus 
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';
import CompetitionCard from './CompetitionCard';
import CompetitionFiltersPanel from './CompetitionFiltersPanel';
import CompetitionStats from './CompetitionStats';
import CompetitionLeaderboard from './CompetitionLeaderboard';
import CompetitionActivity from './CompetitionActivity';
import CompetitionProgress from './CompetitionProgress';

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
      id={`competition-tabpanel-${index}`}
      aria-labelledby={`competition-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CompetitionDashboard: React.FC = () => {
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState<CompetitionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CompetitionFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await competitionApi.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load competition data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFiltersChange = (newFilters: CompetitionFilters) => {
    setFilters(newFilters);
  };

  const filteredCompetitions = dashboardData?.competitions.filter(competition => {
    // Search filter
    if (searchQuery && !competition.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !competition.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filters.type && filters.type.length > 0 && !filters.type.includes(competition.type)) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0 && !filters.status.includes(competition.status)) {
      return false;
    }

    // Difficulty filter
    if (filters.difficultyLevel && filters.difficultyLevel.length > 0 && 
        !filters.difficultyLevel.includes(competition.difficultyLevel)) {
      return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0 && 
        !filters.tags.some(tag => competition.tags.includes(tag))) {
      return false;
    }

    return true;
  }) || [];

  const getStatusColor = (status: CompetitionStatus) => {
    switch (status) {
      case CompetitionStatus.ACTIVE:
        return theme.palette.success.main;
      case CompetitionStatus.UPCOMING:
        return theme.palette.info.main;
      case CompetitionStatus.COMPLETED:
        return theme.palette.grey[500];
      case CompetitionStatus.CANCELLED:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTypeIcon = (type: CompetitionType) => {
    switch (type) {
      case CompetitionType.HACKTOBERFEST:
        return '🎃';
      case CompetitionType.GITHUB_GAME_OFF:
        return '🎮';
      case CompetitionType.GITLAB_HACKATHON:
        return '🦊';
      case CompetitionType.OPEN_SOURCE_CHALLENGE:
        return '🌟';
      default:
        return '🏆';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={60} />
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} md={6} lg={3} key={item}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={loadDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
      p: 3
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          🏆 Competition Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Participate in coding competitions and showcase your skills
        </Typography>
      </Box>

      {/* Stats Overview */}
      {dashboardData?.userStats && (
        <CompetitionStats stats={dashboardData.userStats} />
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search competitions..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 300 }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ 
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  borderColor: theme.palette.primary.light,
                  backgroundColor: 'rgba(0, 255, 255, 0.1)'
                }
              }}
            >
              Filters
            </Button>
          </Box>
          
          {showFilters && (
            <Fade in={showFilters}>
              <Box sx={{ mt: 2 }}>
                <CompetitionFiltersPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </Box>
            </Fade>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                color: theme.palette.text.secondary,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
              }
            }}
          >
            <Tab 
              label="All Competitions" 
              icon={<TrophyIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="My Progress" 
              icon={<TimelineIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Leaderboard" 
              icon={<LeaderboardIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Activity" 
              icon={<NotificationIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* All Competitions Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {filteredCompetitions.length === 0 ? (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No competitions found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or filters
                  </Typography>
                </Box>
              </Grid>
            ) : (
              filteredCompetitions.map((competition) => (
                <Grid item xs={12} md={6} lg={4} key={competition.id}>
                  <CompetitionCard 
                    competition={competition}
                    userParticipation={dashboardData?.userParticipations.find(
                      p => p.competitionId === competition.id
                    )}
                  />
                </Grid>
              ))
            )}
          </Grid>
        </TabPanel>

        {/* My Progress Tab */}
        <TabPanel value={activeTab} index={1}>
          <CompetitionProgress 
            participations={dashboardData?.userParticipations || []}
            competitions={dashboardData?.competitions || []}
          />
        </TabPanel>

        {/* Leaderboard Tab */}
        <TabPanel value={activeTab} index={2}>
          <CompetitionLeaderboard 
            leaderboard={dashboardData?.leaderboard || []}
          />
        </TabPanel>

        {/* Activity Tab */}
        <TabPanel value={activeTab} index={3}>
          <CompetitionActivity 
            activities={dashboardData?.recentActivity || []}
          />
        </TabPanel>
      </Card>
    </Box>
  );
};

export default CompetitionDashboard;