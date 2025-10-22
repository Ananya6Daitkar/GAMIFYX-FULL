/**
 * Class Overview Component - Shows aggregated class performance metrics
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  School,
  Assignment,
  EmojiEvents,
  Refresh
} from '@mui/icons-material';
import {
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface ClassMetrics {
  totalStudents: number;
  activeStudents: number;
  atRiskStudents: number;
  averagePerformance: number;
  completionRate: number;
  engagementScore: number;
  trendsData: Array<{
    date: string;
    performance: number;
    engagement: number;
    submissions: number;
  }>;
  performanceDistribution: Array<{
    range: string;
    count: number;
    color: string;
  }>;
  skillsProgress: Array<{
    skill: string;
    average: number;
    improvement: number;
  }>;
}

interface ClassOverviewProps {
  classId: string;
  metrics: ClassMetrics;
  onRefresh: () => void;
}

const ClassOverview: React.FC<ClassOverviewProps> = ({
  // classId,
  metrics,
  onRefresh
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  const handleTimeframeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeframe: '7d' | '30d' | '90d' | null
  ) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp color="success" />;
    if (current < previous) return <TrendingDown color="error" />;
    return <CheckCircle color="disabled" />;
  };

  const getInsights = () => {
    const insights = [];
    
    if (metrics.atRiskStudents > metrics.totalStudents * 0.1) {
      insights.push(`High number of at-risk students (${metrics.atRiskStudents}) requires immediate attention`);
    }
    
    if (metrics.averagePerformance < 70) {
      insights.push('Class average performance is below target - consider additional support measures');
    }
    
    if (metrics.engagementScore < 75) {
      insights.push('Low engagement score suggests need for more interactive learning activities');
    }
    
    const improvingSkills = metrics.skillsProgress.filter(skill => skill.improvement > 5);
    if (improvingSkills.length > 0) {
      insights.push(`Strong improvement in ${improvingSkills.map(s => s.skill).join(', ')}`);
    }
    
    return insights;
  };

  // const COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3'];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Class Overview
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
            <IconButton onClick={onRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
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
                    {metrics.totalStudents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <School />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="success.main">
                  {metrics.activeStudents} active this week
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
                  <Typography variant="h4" color="error">
                    {metrics.atRiskStudents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    At-Risk Students
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <Warning />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {((metrics.atRiskStudents / metrics.totalStudents) * 100).toFixed(1)}% of class
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
                  <Typography variant="h4" color={`${getPerformanceColor(metrics.averagePerformance)}.main`}>
                    {metrics.averagePerformance}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Performance
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${getPerformanceColor(metrics.averagePerformance)}.main` }}>
                  <EmojiEvents />
                </Avatar>
              </Box>
              <Box mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={metrics.averagePerformance}
                  color={getPerformanceColor(metrics.averagePerformance) as any}
                  sx={{ height: 6, borderRadius: 3 }}
                />
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
                    {metrics.completionRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Assignment />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  Engagement: {metrics.engagementScore}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Performance Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <RechartsTooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="performance"
                      stackId="1"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.3}
                      name="Performance %"
                    />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stackId="2"
                      stroke="#2e7d32"
                      fill="#2e7d32"
                      fillOpacity={0.3}
                      name="Engagement %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Distribution
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.performanceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, count }) => `${range}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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

      {/* Skills Progress */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Skills Progress Overview
          </Typography>
          <Box height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.skillsProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="average" fill="#1976d2" name="Class Average %" />
                <Bar dataKey="improvement" fill="#2e7d32" name="Improvement %" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          
          {/* Skills Summary */}
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Skills Summary
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {metrics.skillsProgress.map((skill) => (
                <Chip
                  key={skill.skill}
                  label={`${skill.skill}: ${skill.average}%`}
                  color={skill.average >= 70 ? 'success' : skill.average >= 50 ? 'warning' : 'error'}
                  variant="outlined"
                  icon={getTrendIcon(skill.average, skill.average - skill.improvement)}
                />
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* AI-Powered Insights */}
      {getInsights().length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI-Powered Class Insights
            </Typography>
            <List>
              {getInsights().map((insight, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={insight}
                    secondary={`Generated at ${new Date().toLocaleTimeString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ClassOverview;