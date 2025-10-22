/**
 * Class PR Overview Component - Shows class-wide PR submission statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Button
} from '@mui/material';
import { formatChartDate } from '../../utils/dateUtils';
import {
  GitHub,
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  Refresh,
  Settings,
  OpenInNew,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { ClassPROverview as ClassPROverviewType } from '../../types/github';

interface ClassPROverviewProps {
  teacherId: string;
  timeframe?: '7d' | '30d' | '90d';
  onTimeframeChange?: (timeframe: '7d' | '30d' | '90d') => void;
  onRefresh?: () => void;
  onConfigureGitHub?: () => void;
}

const ClassPROverview: React.FC<ClassPROverviewProps> = ({
  teacherId,
  timeframe = '30d',
  onTimeframeChange,
  onRefresh,
  onConfigureGitHub
}) => {
  const [overview, setOverview] = useState<ClassPROverviewType | null>(null);
  const [trendData, setTrendData] = useState<Array<{
    date: string;
    prs: number;
    merged: number;
    open: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClassOverview();
    fetchTrendData();
  }, [teacherId, timeframe]);

  const fetchClassOverview = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/v1/github/class-overview?teacherId=${teacherId}&timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setOverview(data);
      } else {
        throw new Error('Failed to fetch class overview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Mock data for development
      const mockOverview: ClassPROverviewType = {
        teacherId,
        totalStudents: 25,
        studentsWithPRs: 18,
        totalPRs: 142,
        prsThisWeek: 23,
        prsThisMonth: 89,
        averagePRsPerStudent: 5.7,
        topContributors: [
          { studentId: 'student1', githubUsername: 'alice_dev', prCount: 15 },
          { studentId: 'student2', githubUsername: 'bob_coder', prCount: 12 },
          { studentId: 'student3', githubUsername: 'charlie_git', prCount: 10 },
          { studentId: 'student4', githubUsername: 'diana_code', prCount: 9 },
          { studentId: 'student5', githubUsername: 'eve_dev', prCount: 8 }
        ],
        repositoryStats: [
          { repositoryName: 'web-app-project', prCount: 45, activeContributors: 12 },
          { repositoryName: 'api-backend', prCount: 38, activeContributors: 10 },
          { repositoryName: 'mobile-app', prCount: 32, activeContributors: 8 },
          { repositoryName: 'data-analysis', prCount: 27, activeContributors: 7 }
        ],
        generatedAt: new Date().toISOString()
      };
      setOverview(mockOverview);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/v1/github/class-trends?teacherId=${teacherId}&timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (err) {
      // Mock trend data for development
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const mockTrendData = Array.from({ length: Math.min(days, 14) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          date: date.toISOString().split('T')[0],
          prs: Math.floor(Math.random() * 10) + 2,
          merged: Math.floor(Math.random() * 6) + 1,
          open: Math.floor(Math.random() * 4) + 1
        };
      });
      setTrendData(mockTrendData);
    }
  };

  const handleTimeframeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeframe: '7d' | '30d' | '90d' | null
  ) => {
    if (newTimeframe !== null) {
      onTimeframeChange?.(newTimeframe);
    }
  };

  const handleRefresh = () => {
    fetchClassOverview();
    fetchTrendData();
    onRefresh?.();
  };

  const getEngagementColor = (percentage: number) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2'];

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Loading class overview...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error && !overview) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }>
            Failed to load class PR overview: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="info"
            action={
              onConfigureGitHub && (
                <Button size="small" onClick={onConfigureGitHub}>
                  Configure
                </Button>
              )
            }
          >
            No GitHub data available. Configure GitHub integration to start tracking.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const engagementPercentage = (overview.studentsWithPRs / overview.totalStudents) * 100;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Class GitHub Activity
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
            size="small"
          >
            <ToggleButton value="7d">7 Days</ToggleButton>
            <ToggleButton value="30d">30 Days</ToggleButton>
            <ToggleButton value="90d">90 Days</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
          {onConfigureGitHub && (
            <Tooltip title="GitHub Settings">
              <IconButton onClick={onConfigureGitHub}>
                <Settings />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {overview.totalPRs}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total PRs
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <GitHub />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="success.main">
                  {overview.prsThisWeek} this week
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info">
                    {overview.studentsWithPRs}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Students
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <People />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {engagementPercentage.toFixed(1)}% engagement
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color={`${getEngagementColor(engagementPercentage)}.main`}>
                    {overview.averagePRsPerStudent.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg PRs/Student
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${getEngagementColor(engagementPercentage)}.main` }}>
                  <Assignment />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {overview.prsThisMonth} this month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success">
                    {overview.repositoryStats.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Repositories
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  All active
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* PR Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PR Activity Trends
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatChartDate}
                    />
                    <YAxis />
                    <RechartsTooltip 
                      labelFormatter={formatChartDate}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="prs"
                      stackId="1"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.3}
                      name="Total PRs"
                    />
                    <Area
                      type="monotone"
                      dataKey="merged"
                      stackId="2"
                      stroke="#2e7d32"
                      fill="#2e7d32"
                      fillOpacity={0.3}
                      name="Merged PRs"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Repository Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Repository Activity
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overview.repositoryStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ repositoryName, prCount }) => `${repositoryName}: ${prCount}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="prCount"
                    >
                      {overview.repositoryStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Contributors and Repository Stats */}
      <Grid container spacing={3}>
        {/* Top Contributors */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Contributors
              </Typography>
              <List>
                {overview.topContributors.map((contributor, index) => (
                  <React.Fragment key={contributor.studentId}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {contributor.githubUsername}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${contributor.prCount} PRs`}
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={`Student ID: ${contributor.studentId}`}
                      />
                      <IconButton
                        size="small"
                        onClick={() => window.open(`https://github.com/${contributor.githubUsername}`, '_blank')}
                      >
                        <OpenInNew />
                      </IconButton>
                    </ListItem>
                    {index < overview.topContributors.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Repository Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Repository Statistics
              </Typography>
              <List>
                {overview.repositoryStats.map((repo, index) => (
                  <React.Fragment key={repo.repositoryName}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <GitHub />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {repo.repositoryName}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${repo.prCount} PRs`}
                              color="primary"
                            />
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="caption">
                              {repo.activeContributors} contributors
                            </Typography>
                            <Chip
                              size="small"
                              label={repo.activeContributors > 5 ? 'High Activity' : 'Low Activity'}
                              color={repo.activeContributors > 5 ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < overview.repositoryStats.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Engagement Alert */}
      {engagementPercentage < 70 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle2">
            Low GitHub Engagement ({engagementPercentage.toFixed(1)}%)
          </Typography>
          <Typography variant="body2">
            Only {overview.studentsWithPRs} out of {overview.totalStudents} students have submitted PRs. 
            Consider reaching out to inactive students or reviewing GitHub setup instructions.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ClassPROverview;