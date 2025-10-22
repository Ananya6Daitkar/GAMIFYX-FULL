/**
 * AI Metrics Dashboard - Real-time AI service monitoring and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  IconButton,
  Fade,
  Zoom,
  CircularProgress,
} from '@mui/material';
import {
  Psychology,
  Speed,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Error,
  Refresh,
  Timeline,
  Analytics,
  AutoFixHigh,
  Memory,
  Storage,
  NetworkCheck,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface AIMetrics {
  feedbackGeneration: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    accuracyScore: number;
    implementationRate: number;
  };
  modelPrediction: {
    totalPredictions: number;
    averageConfidence: number;
    accuracyTrend: number[];
    driftScore: number;
    lastTrainingDate: string;
  };
  serviceHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  };
  optimizations: {
    id: string;
    type: 'performance' | 'accuracy' | 'efficiency';
    recommendation: string;
    impact: 'low' | 'medium' | 'high';
    priority: number;
  }[];
}

interface AIMetricsDashboardProps {
  metrics: AIMetrics;
  onRefresh?: () => void;
  loading?: boolean;
}

const AIMetricsDashboard: React.FC<AIMetricsDashboardProps> = ({
  metrics,
  onRefresh,
  loading = false,
}) => {
  const [animationTrigger, setAnimationTrigger] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('feedback');

  useEffect(() => {
    setAnimationTrigger(true);
  }, []);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return cyberpunkColors.success.main;
      case 'warning': return cyberpunkColors.warning.main;
      case 'critical': return cyberpunkColors.error.main;
      default: return cyberpunkColors.primary.main;
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'critical': return <Error />;
      default: return <NetworkCheck />;
    }
  };

  const getOptimizationColor = (impact: string) => {
    switch (impact) {
      case 'high': return cyberpunkColors.error.main;
      case 'medium': return cyberpunkColors.warning.main;
      case 'low': return cyberpunkColors.success.main;
      default: return cyberpunkColors.primary.main;
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <Psychology 
              sx={{ 
                color: cyberpunkColors.secondary.main, 
                mr: 2, 
                fontSize: 28,
                animation: 'pulse 2s infinite',
              }} 
            />
            <Typography
              variant="h5"
              sx={{
                color: cyberpunkColors.secondary.main,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              AI SERVICE METRICS
            </Typography>
          </Box>
          <Tooltip title="Refresh Metrics">
            <IconButton
              onClick={onRefresh}
              disabled={loading}
              sx={{
                color: cyberpunkColors.secondary.main,
                '&:hover': {
                  backgroundColor: `${cyberpunkColors.secondary.main}20`,
                },
              }}
            >
              <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          {/* Service Health Overview */}
          <Grid item xs={12} md={4}>
            <Fade in={animationTrigger} timeout={500}>
              <Card
                sx={{
                  background: cyberpunkColors.surface.glass,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${getHealthColor(metrics.serviceHealth.status)}40`,
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        color: getHealthColor(metrics.serviceHealth.status),
                        mr: 2,
                      }}
                    >
                      {getHealthIcon(metrics.serviceHealth.status)}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: cyberpunkColors.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      Service Health
                    </Typography>
                  </Box>

                  <Box mb={3}>
                    <Typography
                      variant="h4"
                      sx={{
                        color: getHealthColor(metrics.serviceHealth.status),
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        mb: 1,
                      }}
                    >
                      {metrics.serviceHealth.status}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: cyberpunkColors.text.secondary }}
                    >
                      Uptime: {formatUptime(metrics.serviceHealth.uptime)}
                    </Typography>
                  </Box>

                  {/* Health Metrics */}
                  <Box>
                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: cyberpunkColors.text.secondary }}>
                          CPU Usage
                        </Typography>
                        <Typography variant="caption" sx={{ color: cyberpunkColors.text.primary }}>
                          {metrics.serviceHealth.cpuUsage}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.serviceHealth.cpuUsage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: metrics.serviceHealth.cpuUsage > 80 
                              ? cyberpunkColors.error.main
                              : metrics.serviceHealth.cpuUsage > 60
                              ? cyberpunkColors.warning.main
                              : cyberpunkColors.success.main,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>

                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: cyberpunkColors.text.secondary }}>
                          Memory Usage
                        </Typography>
                        <Typography variant="caption" sx={{ color: cyberpunkColors.text.primary }}>
                          {metrics.serviceHealth.memoryUsage}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.serviceHealth.memoryUsage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: metrics.serviceHealth.memoryUsage > 85 
                              ? cyberpunkColors.error.main
                              : metrics.serviceHealth.memoryUsage > 70
                              ? cyberpunkColors.warning.main
                              : cyberpunkColors.success.main,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>

                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: cyberpunkColors.text.secondary }}>
                          Error Rate
                        </Typography>
                        <Typography variant="caption" sx={{ color: cyberpunkColors.text.primary }}>
                          {metrics.serviceHealth.errorRate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.serviceHealth.errorRate}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: metrics.serviceHealth.errorRate > 5 
                              ? cyberpunkColors.error.main
                              : metrics.serviceHealth.errorRate > 2
                              ? cyberpunkColors.warning.main
                              : cyberpunkColors.success.main,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Feedback Generation Metrics */}
          <Grid item xs={12} md={4}>
            <Zoom in={animationTrigger} timeout={700}>
              <Card
                sx={{
                  background: cyberpunkColors.surface.glass,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${cyberpunkColors.primary.main}40`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: selectedMetric === 'feedback' ? 'scale(1.02)' : 'scale(1)',
                  '&:hover': {
                    border: `1px solid ${cyberpunkColors.primary.main}80`,
                    transform: 'scale(1.02)',
                  },
                }}
                onClick={() => setSelectedMetric('feedback')}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Analytics sx={{ color: cyberpunkColors.primary.main, mr: 2 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        color: cyberpunkColors.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      Feedback Generation
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography
                        variant="h4"
                        sx={{
                          color: cyberpunkColors.primary.main,
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {metrics.feedbackGeneration.totalRequests.toLocaleString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        Total Requests
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography
                        variant="h4"
                        sx={{
                          color: cyberpunkColors.success.main,
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {metrics.feedbackGeneration.successRate}%
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        Success Rate
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="caption" sx={{ color: cyberpunkColors.text.secondary }}>
                        Accuracy Score
                      </Typography>
                      <Typography variant="caption" sx={{ color: cyberpunkColors.text.primary }}>
                        {metrics.feedbackGeneration.accuracyScore}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={metrics.feedbackGeneration.accuracyScore}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: cyberpunkColors.primary.main,
                          borderRadius: 4,
                          boxShadow: `0 0 12px ${cyberpunkColors.primary.main}60`,
                        },
                      }}
                    />
                  </Box>

                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Box textAlign="center">
                      <Typography
                        variant="body2"
                        sx={{ color: cyberpunkColors.text.primary, fontWeight: 600 }}
                      >
                        {metrics.feedbackGeneration.averageResponseTime}ms
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        Avg Response
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography
                        variant="body2"
                        sx={{ color: cyberpunkColors.text.primary, fontWeight: 600 }}
                      >
                        {metrics.feedbackGeneration.implementationRate}%
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        Implementation
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          {/* Model Prediction Metrics */}
          <Grid item xs={12} md={4}>
            <Zoom in={animationTrigger} timeout={900}>
              <Card
                sx={{
                  background: cyberpunkColors.surface.glass,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${cyberpunkColors.secondary.main}40`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: selectedMetric === 'prediction' ? 'scale(1.02)' : 'scale(1)',
                  '&:hover': {
                    border: `1px solid ${cyberpunkColors.secondary.main}80`,
                    transform: 'scale(1.02)',
                  },
                }}
                onClick={() => setSelectedMetric('prediction')}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Timeline sx={{ color: cyberpunkColors.secondary.main, mr: 2 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        color: cyberpunkColors.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      Model Predictions
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography
                        variant="h4"
                        sx={{
                          color: cyberpunkColors.secondary.main,
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {metrics.modelPrediction.totalPredictions.toLocaleString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        Total Predictions
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center">
                        <Typography
                          variant="h4"
                          sx={{
                            color: cyberpunkColors.secondary.main,
                            fontWeight: 700,
                            mb: 0.5,
                            mr: 1,
                          }}
                        >
                          {metrics.modelPrediction.averageConfidence}%
                        </Typography>
                        {metrics.modelPrediction.driftScore < 0.3 ? (
                          <TrendingUp sx={{ color: cyberpunkColors.success.main }} />
                        ) : (
                          <TrendingDown sx={{ color: cyberpunkColors.error.main }} />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        Avg Confidence
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="caption" sx={{ color: cyberpunkColors.text.secondary }}>
                        Model Drift Score
                      </Typography>
                      <Typography variant="caption" sx={{ color: cyberpunkColors.text.primary }}>
                        {(metrics.modelPrediction.driftScore * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={metrics.modelPrediction.driftScore * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: metrics.modelPrediction.driftScore > 0.5 
                            ? cyberpunkColors.error.main
                            : metrics.modelPrediction.driftScore > 0.3
                            ? cyberpunkColors.warning.main
                            : cyberpunkColors.success.main,
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>

                  <Box mt={2}>
                    <Typography
                      variant="caption"
                      sx={{ color: cyberpunkColors.text.secondary }}
                    >
                      Last Training: {formatTimeAgo(metrics.modelPrediction.lastTrainingDate)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          {/* AI Performance Optimizations */}
          <Grid item xs={12}>
            <Fade in={animationTrigger} timeout={1100}>
              <Card
                sx={{
                  background: cyberpunkColors.surface.glass,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${cyberpunkColors.warning.main}40`,
                  borderRadius: '16px',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <AutoFixHigh sx={{ color: cyberpunkColors.warning.main, mr: 2 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        color: cyberpunkColors.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      AI Performance Optimizations
                    </Typography>
                    <Chip
                      label={`${metrics.optimizations.length} Recommendations`}
                      sx={{
                        ml: 2,
                        backgroundColor: `${cyberpunkColors.warning.main}20`,
                        color: cyberpunkColors.warning.main,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>

                  <List>
                    {metrics.optimizations.map((optimization, index) => (
                      <ListItem
                        key={optimization.id}
                        sx={{
                          background: `${getOptimizationColor(optimization.impact)}10`,
                          borderRadius: '8px',
                          mb: 1,
                          border: `1px solid ${getOptimizationColor(optimization.impact)}30`,
                        }}
                      >
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: `${getOptimizationColor(optimization.impact)}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: getOptimizationColor(optimization.impact),
                            }}
                          >
                            {optimization.type === 'performance' && <Speed />}
                            {optimization.type === 'accuracy' && <Analytics />}
                            {optimization.type === 'efficiency' && <Memory />}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography
                                variant="body1"
                                sx={{
                                  color: cyberpunkColors.text.primary,
                                  fontWeight: 600,
                                }}
                              >
                                {optimization.recommendation}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip
                                  label={optimization.type.toUpperCase()}
                                  size="small"
                                  sx={{
                                    backgroundColor: `${cyberpunkColors.primary.main}20`,
                                    color: cyberpunkColors.primary.main,
                                    fontSize: '0.6rem',
                                  }}
                                />
                                <Chip
                                  label={`${optimization.impact.toUpperCase()} IMPACT`}
                                  size="small"
                                  sx={{
                                    backgroundColor: `${getOptimizationColor(optimization.impact)}20`,
                                    color: getOptimizationColor(optimization.impact),
                                    fontSize: '0.6rem',
                                  }}
                                />
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              sx={{ color: cyberpunkColors.text.secondary }}
                            >
                              Priority: {optimization.priority}/10
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>

                  {metrics.optimizations.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <CheckCircle sx={{ fontSize: 60, color: cyberpunkColors.success.main, mb: 2 }} />
                      <Typography variant="h6" sx={{ color: cyberpunkColors.text.primary, mb: 1 }}>
                        All Systems Optimized
                      </Typography>
                      <Typography variant="body2" sx={{ color: cyberpunkColors.text.secondary }}>
                        No performance optimizations needed at this time
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AIMetricsDashboard;