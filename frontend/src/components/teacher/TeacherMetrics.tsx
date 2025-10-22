/**
 * Teacher Metrics Component - Track teacher engagement and dashboard usage
 */

import React, { useState, useEffect } from 'react';
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
  // Dialog,
  // DialogTitle,
  // DialogContent,
  // DialogActions,
  // Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  // Divider
} from '@mui/material';
import {
  Dashboard,
  // AccessTime,
  // Visibility,
  // TouchApp,
  TrendingUp,
  // Assessment,
  People,
  Warning,
  CheckCircle,
  // Timeline,
  Refresh,
  Info,
  School
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface TeacherMetrics {
  userId: string;
  teacherName: string;
  dashboardUsage: {
    totalSessions: number;
    totalTimeSpent: number; // in minutes
    averageSessionDuration: number; // in minutes
    lastLogin: string;
    loginFrequency: number; // logins per week
    featuresUsed: Array<{
      feature: string;
      usageCount: number;
      lastUsed: string;
    }>;
    dailyUsage: Array<{
      date: string;
      sessions: number;
      timeSpent: number;
      actionsPerformed: number;
    }>;
  };
  interventionActivity: {
    totalInterventions: number;
    activeInterventions: number;
    completedInterventions: number;
    averageResponseTime: number; // in hours
    interventionTypes: Array<{
      type: string;
      count: number;
      successRate: number;
    }>;
    weeklyInterventions: Array<{
      week: string;
      created: number;
      completed: number;
    }>;
  };
  alertManagement: {
    totalAlertsReceived: number;
    alertsAcknowledged: number;
    alertsResolved: number;
    averageResponseTime: number; // in minutes
    alertTypes: Array<{
      type: string;
      count: number;
      averageResolutionTime: number;
    }>;
  };
  studentEngagement: {
    studentsMonitored: number;
    atRiskStudentsIdentified: number;
    studentsImproved: number;
    averageStudentProgress: number;
    engagementTrends: Array<{
      date: string;
      engagement: number;
      interventions: number;
    }>;
  };
  effectiveness: {
    overallScore: number;
    interventionSuccessRate: number;
    studentImprovementRate: number;
    alertResolutionRate: number;
    recommendations: string[];
  };
}

interface TeacherMetricsProps {
  metrics: TeacherMetrics;
  onRefresh: () => void;
}

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({
  metrics,
  onRefresh
}) => {
  // const [detailsDialog] = useState<string | null>(null);
  const [performanceInsights, setPerformanceInsights] = useState<string[]>([]);

  useEffect(() => {
    generatePerformanceInsights();
    generateProfessionalDevelopmentSuggestions();
  }, [metrics]);

  const [professionalDevelopment, setProfessionalDevelopment] = useState<string[]>([]);

  const generatePerformanceInsights = () => {
    const insights: string[] = [];

    // Dashboard usage insights
    if (metrics.dashboardUsage.loginFrequency < 3) {
      insights.push('Consider increasing dashboard usage frequency for better student monitoring');
    }
    
    if (metrics.dashboardUsage.averageSessionDuration < 10) {
      insights.push('Short session durations may indicate need for more efficient dashboard design');
    }

    // Intervention insights
    if (metrics.interventionActivity.averageResponseTime > 24) {
      insights.push('Response time to interventions could be improved for better student outcomes');
    }

    if (metrics.interventionActivity.completedInterventions / metrics.interventionActivity.totalInterventions < 0.8) {
      insights.push('Consider strategies to improve intervention completion rates');
    }

    // Alert management insights
    if (metrics.alertManagement.alertsResolved / metrics.alertManagement.totalAlertsReceived < 0.9) {
      insights.push('Alert resolution rate could be improved to ensure no students are missed');
    }

    // Student engagement insights
    if (metrics.studentEngagement.studentsImproved / metrics.studentEngagement.atRiskStudentsIdentified < 0.6) {
      insights.push('Student improvement rate suggests intervention strategies may need adjustment');
    }

    setPerformanceInsights(insights);
  };

  const generateProfessionalDevelopmentSuggestions = () => {
    const suggestions: string[] = [];

    // Based on intervention success rate
    if (metrics.effectiveness.interventionSuccessRate < 70) {
      suggestions.push('Consider attending workshop on student intervention strategies');
    }

    // Based on dashboard usage patterns
    if (metrics.dashboardUsage.averageSessionDuration < 15) {
      suggestions.push('Training on advanced dashboard features could improve efficiency');
    }

    // Based on alert response time
    if (metrics.alertManagement.averageResponseTime > 60) {
      suggestions.push('Time management training for faster alert response');
    }

    // Based on student improvement rate
    if (metrics.effectiveness.studentImprovementRate > 80) {
      suggestions.push('Share your successful strategies in faculty meetings');
      suggestions.push('Consider mentoring other teachers');
    }

    // Based on feature usage
    const lowUsageFeatures = metrics.dashboardUsage.featuresUsed.filter(f => f.usageCount < 10);
    if (lowUsageFeatures.length > 0) {
      suggestions.push(`Explore underutilized features: ${lowUsageFeatures.map(f => f.feature).join(', ')}`);
    }

    setProfessionalDevelopment(suggestions);
  };

  const calculateEngagementTrend = () => {
    const recent = metrics.studentEngagement.engagementTrends.slice(-7);
    if (recent.length < 2) return 0;
    
    const first = recent[0].engagement;
    const last = recent[recent.length - 1].engagement;
    return ((last - first) / first) * 100;
  };

  const getUsageEfficiencyScore = () => {
    const avgSessionTime = metrics.dashboardUsage.averageSessionDuration;
    const actionsPerSession = metrics.dashboardUsage.dailyUsage.reduce((sum, day) => 
      sum + (day.actionsPerformed / day.sessions), 0) / metrics.dashboardUsage.dailyUsage.length;
    
    // Efficiency = actions per minute
    return actionsPerSession / avgSessionTime;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString();
  // };

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Teacher Performance Metrics
        </Typography>
        <Tooltip title="Refresh Metrics">
          <IconButton onClick={onRefresh}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Overall Effectiveness Score */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: `${getEffectivenessColor(metrics.effectiveness.overallScore)}.main`,
                    fontSize: '2rem',
                    mx: 'auto',
                    mb: 1
                  }}
                >
                  {metrics.effectiveness.overallScore}
                </Avatar>
                <Typography variant="h6">Overall Effectiveness</Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on multiple factors
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={9}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" color="primary">
                    {metrics.effectiveness.interventionSuccessRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Intervention Success
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" color="success.main">
                    {metrics.effectiveness.studentImprovementRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Student Improvement
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" color="info.main">
                    {metrics.effectiveness.alertResolutionRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alert Resolution
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" color="warning.main">
                    {metrics.dashboardUsage.loginFrequency}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Logins/Week
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {metrics.dashboardUsage.totalSessions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dashboard Sessions
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Dashboard />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  Avg: {formatTime(metrics.dashboardUsage.averageSessionDuration)}
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
                  <Typography variant="h4" color="success.main">
                    {metrics.interventionActivity.totalInterventions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Interventions Created
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <People />
                </Avatar>
              </Box>
              <Box mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.interventionActivity.completedInterventions / metrics.interventionActivity.totalInterventions) * 100}
                  color="success"
                />
                <Typography variant="caption" color="text.secondary">
                  {metrics.interventionActivity.completedInterventions} completed
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
                  <Typography variant="h4" color="warning.main">
                    {metrics.alertManagement.totalAlertsReceived}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Alerts Received
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Warning />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {metrics.alertManagement.alertsResolved} resolved
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
                  <Typography variant="h4" color="info.main">
                    {metrics.studentEngagement.studentsImproved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Students Improved
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  of {metrics.studentEngagement.atRiskStudentsIdentified} at-risk
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Dashboard Usage Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dashboard Usage Trends
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.dashboardUsage.dailyUsage}>
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
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#1976d2"
                      strokeWidth={2}
                      name="Sessions"
                    />
                    <Line
                      type="monotone"
                      dataKey="timeSpent"
                      stroke="#2e7d32"
                      strokeWidth={2}
                      name="Time Spent (min)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Usage
              </Typography>
              <List>
                {metrics.dashboardUsage.featuresUsed.slice(0, 5).map((feature) => (
                  <ListItem key={feature.feature} divider>
                    <ListItemText
                      primary={feature.feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      secondary={`Used ${feature.usageCount} times`}
                    />
                    <Chip
                      size="small"
                      label={feature.usageCount}
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Intervention Types */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Intervention Types Distribution
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.interventionActivity.interventionTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, count }) => `${type}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.interventionActivity.interventionTypes.map((_entry, index) => (
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

        {/* Weekly Interventions */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Intervention Activity
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.interventionActivity.weeklyInterventions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="created" fill="#1976d2" name="Created" />
                    <Bar dataKey="completed" fill="#2e7d32" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Insights */}
      {performanceInsights.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Insights & Recommendations
            </Typography>
            <List>
              {performanceInsights.map((insight, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Info color="info" />
                  </ListItemIcon>
                  <ListItemText primary={insight} />
                </ListItem>
              ))}
            </List>
            
            {metrics.effectiveness.recommendations.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  System Recommendations
                </Typography>
                <List dense>
                  {metrics.effectiveness.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced Analytics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {calculateEngagementTrend().toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Engagement Trend (7 days)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.abs(calculateEngagementTrend())}
                color={calculateEngagementTrend() > 0 ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {getUsageEfficiencyScore().toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Actions per Minute
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {((metrics.studentEngagement.studentsImproved / metrics.studentEngagement.atRiskStudentsIdentified) * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                At-Risk Recovery Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {metrics.dashboardUsage.featuresUsed.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Features Actively Used
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Professional Development */}
      {professionalDevelopment.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Professional Development Opportunities
            </Typography>
            <List>
              {professionalDevelopment.map((suggestion, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <School color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={suggestion} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detailed Metrics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={1}>
                <Typography variant="h6">{formatTime(metrics.dashboardUsage.totalTimeSpent)}</Typography>
                <Typography variant="caption" color="text.secondary">Total Time Spent</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={1}>
                <Typography variant="h6">{metrics.interventionActivity.averageResponseTime}h</Typography>
                <Typography variant="caption" color="text.secondary">Avg Response Time</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={1}>
                <Typography variant="h6">{metrics.alertManagement.averageResponseTime}m</Typography>
                <Typography variant="caption" color="text.secondary">Alert Response Time</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={1}>
                <Typography variant="h6">{metrics.studentEngagement.averageStudentProgress}%</Typography>
                <Typography variant="caption" color="text.secondary">Avg Student Progress</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TeacherMetrics;