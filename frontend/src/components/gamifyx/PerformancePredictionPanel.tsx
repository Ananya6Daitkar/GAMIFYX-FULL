/**
 * Performance Prediction Panel - Real-time student performance prediction with AI insights
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  IconButton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Person,
  School,
  Speed,
  Refresh,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface StudentPrediction {
  userId: string;
  name: string;
  avatar: string;
  predictedPerformance: number;
  riskScore: number;
  confidence: number;
  factors: {
    submissionFrequency: number;
    codeQualityAvg: number;
    testCoverageAvg: number;
    feedbackImplementationRate: number;
    engagementScore: number;
  };
  recommendations: string[];
  timestamp: string;
  trend: 'improving' | 'declining' | 'stable';
}

interface PerformancePredictionPanelProps {
  predictions: StudentPrediction[];
  onRefresh?: () => void;
  loading?: boolean;
}

const PerformancePredictionPanel: React.FC<PerformancePredictionPanelProps> = ({
  predictions,
  onRefresh,
  loading = false,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<StudentPrediction | null>(null);
  const [animationTrigger, setAnimationTrigger] = useState(false);

  useEffect(() => {
    setAnimationTrigger(true);
    if (predictions.length > 0 && !selectedStudent) {
      setSelectedStudent(predictions[0]);
    }
  }, [predictions, selectedStudent]);

  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= 0.7) return { level: 'High', color: cyberpunkColors.error.main };
    if (riskScore >= 0.4) return { level: 'Medium', color: cyberpunkColors.warning.main };
    return { level: 'Low', color: cyberpunkColors.success.main };
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return cyberpunkColors.success.main;
    if (performance >= 60) return cyberpunkColors.warning.main;
    return cyberpunkColors.error.main;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp sx={{ color: cyberpunkColors.success.main }} />;
      case 'declining': return <TrendingDown sx={{ color: cyberpunkColors.error.main }} />;
      default: return <Speed sx={{ color: cyberpunkColors.primary.main }} />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  const getFactorLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      submissionFrequency: 'Submission Rate',
      codeQualityAvg: 'Code Quality',
      testCoverageAvg: 'Test Coverage',
      feedbackImplementationRate: 'Feedback Implementation',
      engagementScore: 'Engagement Level',
    };
    return labels[key] || key;
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <Psychology 
              sx={{ 
                color: cyberpunkColors.primary.main, 
                mr: 2, 
                fontSize: 28,
                animation: 'pulse 2s infinite',
              }} 
            />
            <Typography
              variant="h5"
              sx={{
                color: cyberpunkColors.primary.main,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              PERFORMANCE PREDICTIONS
            </Typography>
          </Box>
          <Tooltip title="Refresh Predictions">
            <IconButton
              onClick={onRefresh}
              disabled={loading}
              sx={{
                color: cyberpunkColors.primary.main,
                '&:hover': {
                  backgroundColor: `${cyberpunkColors.primary.main}20`,
                },
              }}
            >
              <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          {/* Student List */}
          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              sx={{
                color: cyberpunkColors.text.primary,
                mb: 2,
                fontWeight: 600,
              }}
            >
              Students ({predictions.length})
            </Typography>
            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {predictions.map((prediction, index) => {
                const risk = getRiskLevel(prediction.riskScore);
                const isSelected = selectedStudent?.userId === prediction.userId;
                
                return (
                  <Fade in={animationTrigger} timeout={300 + index * 100} key={prediction.userId}>
                    <ListItem
                      button
                      onClick={() => setSelectedStudent(prediction)}
                      sx={{
                        mb: 1,
                        borderRadius: '12px',
                        background: isSelected 
                          ? `${cyberpunkColors.primary.main}20`
                          : cyberpunkColors.surface.glass,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${isSelected ? cyberpunkColors.primary.main : 'transparent'}40`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: `${cyberpunkColors.primary.main}15`,
                          border: `1px solid ${cyberpunkColors.primary.main}60`,
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={prediction.avatar}
                          sx={{
                            border: `2px solid ${risk.color}`,
                            boxShadow: `0 0 12px ${risk.color}40`,
                          }}
                        >
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
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
                              {prediction.name}
                            </Typography>
                            {getTrendIcon(prediction.trend)}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                              <Typography
                                variant="caption"
                                sx={{ color: cyberpunkColors.text.secondary }}
                              >
                                Performance: {prediction.predictedPerformance.toFixed(1)}%
                              </Typography>
                              <Chip
                                label={`${risk.level} Risk`}
                                size="small"
                                sx={{
                                  backgroundColor: `${risk.color}20`,
                                  color: risk.color,
                                  fontSize: '0.6rem',
                                  height: 18,
                                }}
                              />
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={prediction.predictedPerformance}
                              sx={{
                                mt: 1,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getPerformanceColor(prediction.predictedPerformance),
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  </Fade>
                );
              })}
            </List>
          </Grid>

          {/* Detailed Prediction View */}
          <Grid item xs={12} md={8}>
            {selectedStudent ? (
              <Zoom in={!!selectedStudent} timeout={500}>
                <Card
                  sx={{
                    background: cyberpunkColors.surface.glass,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${cyberpunkColors.primary.main}40`,
                    borderRadius: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Student Header */}
                    <Box display="flex" alignItems="center" mb={3}>
                      <Avatar
                        src={selectedStudent.avatar}
                        sx={{
                          width: 60,
                          height: 60,
                          mr: 3,
                          border: `3px solid ${getRiskLevel(selectedStudent.riskScore).color}`,
                          boxShadow: `0 0 20px ${getRiskLevel(selectedStudent.riskScore).color}40`,
                        }}
                      >
                        <Person sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Box flex={1}>
                        <Typography
                          variant="h5"
                          sx={{
                            color: cyberpunkColors.text.primary,
                            fontWeight: 600,
                            mb: 0.5,
                          }}
                        >
                          {selectedStudent.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography
                            variant="caption"
                            sx={{ color: cyberpunkColors.text.secondary }}
                          >
                            Last updated: {formatTimeAgo(selectedStudent.timestamp)}
                          </Typography>
                          <Chip
                            label={`${selectedStudent.confidence}% Confidence`}
                            sx={{
                              backgroundColor: `${cyberpunkColors.primary.main}20`,
                              color: cyberpunkColors.primary.main,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>

                    {/* Performance Metrics */}
                    <Grid container spacing={3} mb={3}>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              color: cyberpunkColors.text.primary,
                              mb: 2,
                              fontWeight: 600,
                            }}
                          >
                            Predicted Performance
                          </Typography>
                          <Box display="flex" alignItems="center" mb={2}>
                            <Typography
                              variant="h3"
                              sx={{
                                color: getPerformanceColor(selectedStudent.predictedPerformance),
                                fontWeight: 700,
                                mr: 2,
                              }}
                            >
                              {selectedStudent.predictedPerformance.toFixed(1)}%
                            </Typography>
                            {getTrendIcon(selectedStudent.trend)}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={selectedStudent.predictedPerformance}
                            sx={{
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getPerformanceColor(selectedStudent.predictedPerformance),
                                borderRadius: 6,
                                boxShadow: `0 0 12px ${getPerformanceColor(selectedStudent.predictedPerformance)}60`,
                              },
                            }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              color: cyberpunkColors.text.primary,
                              mb: 2,
                              fontWeight: 600,
                            }}
                          >
                            Risk Assessment
                          </Typography>
                          <Box display="flex" alignItems="center" mb={2}>
                            <Typography
                              variant="h3"
                              sx={{
                                color: getRiskLevel(selectedStudent.riskScore).color,
                                fontWeight: 700,
                                mr: 2,
                              }}
                            >
                              {getRiskLevel(selectedStudent.riskScore).level}
                            </Typography>
                            {selectedStudent.riskScore >= 0.7 ? (
                              <Warning sx={{ color: cyberpunkColors.error.main, fontSize: 30 }} />
                            ) : (
                              <CheckCircle sx={{ color: cyberpunkColors.success.main, fontSize: 30 }} />
                            )}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={selectedStudent.riskScore * 100}
                            sx={{
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getRiskLevel(selectedStudent.riskScore).color,
                                borderRadius: 6,
                                boxShadow: `0 0 12px ${getRiskLevel(selectedStudent.riskScore).color}60`,
                              },
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Performance Factors */}
                    <Box mb={3}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: cyberpunkColors.text.primary,
                          mb: 2,
                          fontWeight: 600,
                        }}
                      >
                        Performance Factors
                      </Typography>
                      <Grid container spacing={2}>
                        {Object.entries(selectedStudent.factors).map(([key, value]) => (
                          <Grid item xs={12} sm={6} key={key}>
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography
                                  variant="body2"
                                  sx={{ color: cyberpunkColors.text.secondary }}
                                >
                                  {getFactorLabel(key)}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: cyberpunkColors.text.primary, fontWeight: 600 }}
                                >
                                  {(value * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={value * 100}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: value > 0.7 
                                      ? cyberpunkColors.success.main
                                      : value > 0.4
                                      ? cyberpunkColors.warning.main
                                      : cyberpunkColors.error.main,
                                    borderRadius: 3,
                                  },
                                }}
                              />
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>

                    {/* Recommendations */}
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          color: cyberpunkColors.text.primary,
                          mb: 2,
                          fontWeight: 600,
                        }}
                      >
                        AI Recommendations
                      </Typography>
                      <List>
                        {selectedStudent.recommendations.map((recommendation, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              background: `${cyberpunkColors.secondary.main}10`,
                              borderRadius: '8px',
                              mb: 1,
                              border: `1px solid ${cyberpunkColors.secondary.main}30`,
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar
                                sx={{
                                  backgroundColor: `${cyberpunkColors.secondary.main}20`,
                                  color: cyberpunkColors.secondary.main,
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                <School sx={{ fontSize: 18 }} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: cyberpunkColors.text.primary,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {recommendation}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </CardContent>
                </Card>
              </Zoom>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 400,
                  background: cyberpunkColors.surface.glass,
                  borderRadius: '16px',
                  border: `1px solid ${cyberpunkColors.primary.main}20`,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ color: cyberpunkColors.text.secondary }}
                >
                  Select a student to view predictions
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>

        {predictions.length === 0 && (
          <Box textAlign="center" py={6}>
            <Psychology sx={{ fontSize: 80, color: cyberpunkColors.text.secondary, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" mb={1}>
              No Predictions Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Performance predictions will appear here once student data is analyzed
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformancePredictionPanel;