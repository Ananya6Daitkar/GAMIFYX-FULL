/**
 * AI Insights Section - Animated visualization of AI predictions and anomalies
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
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Warning,
  AutoFixHigh,
  // Visibility,
  // Timeline,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface AIInsight {
  id: string;
  type: 'anomaly' | 'prediction' | 'optimization';
  message: string;
  confidence: number;
  timestamp: string;
}

interface AIInsightsSectionProps {
  insights: AIInsight[];
}

const AIInsightsSection: React.FC<AIInsightsSectionProps> = ({ insights }) => {
  const [activeInsight, setActiveInsight] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveInsight((prev) => (prev + 1) % insights.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [insights.length]);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 3);
    }, 1000);

    return () => clearInterval(phaseInterval);
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'anomaly': return <Warning sx={{ fontSize: 24 }} />;
      case 'prediction': return <TrendingUp sx={{ fontSize: 24 }} />;
      case 'optimization': return <AutoFixHigh sx={{ fontSize: 24 }} />;
      default: return <Psychology sx={{ fontSize: 24 }} />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'anomaly': return cyberpunkColors.error.main;
      case 'prediction': return cyberpunkColors.primary.main;
      case 'optimization': return cyberpunkColors.success.main;
      default: return cyberpunkColors.secondary.main;
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

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
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
            AI INSIGHTS & PREDICTIONS
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Main Insight Display */}
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                background: cyberpunkColors.surface.glass,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${cyberpunkColors.secondary.main}40`,
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 200,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  background: `linear-gradient(135deg, ${cyberpunkColors.secondary.main}10, transparent)`,
                  animation: 'shimmer 3s infinite',
                },
                '@keyframes shimmer': {
                  '0%': { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(100%)' },
                },
              }}
            >
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                {insights.length > 0 && insights[activeInsight] && (
                  <>
                    {/* Header */}
                    <Box display="flex" alignItems="center" mb={3}>
                      <Box
                        sx={{
                          color: getInsightColor(insights[activeInsight].type),
                          mr: 2,
                          animation: animationPhase === 0 ? 'bounce 0.5s' : 'none',
                        }}
                      >
                        {getInsightIcon(insights[activeInsight].type)}
                      </Box>
                      <Box flex={1}>
                        <Typography
                          variant="h6"
                          sx={{
                            color: cyberpunkColors.text.primary,
                            fontWeight: 600,
                            mb: 0.5,
                          }}
                        >
                          {insights[activeInsight].type.toUpperCase()} DETECTED
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: cyberpunkColors.text.secondary }}
                        >
                          {formatTimeAgo(insights[activeInsight].timestamp)}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${insights[activeInsight].confidence}% CONFIDENCE`}
                        sx={{
                          backgroundColor: `${getInsightColor(insights[activeInsight].type)}20`,
                          color: getInsightColor(insights[activeInsight].type),
                          border: `1px solid ${getInsightColor(insights[activeInsight].type)}40`,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>

                    {/* Message */}
                    <Typography
                      variant="body1"
                      sx={{
                        color: cyberpunkColors.text.primary,
                        mb: 3,
                        lineHeight: 1.6,
                        fontSize: '1.1rem',
                      }}
                    >
                      {insights[activeInsight].message}
                    </Typography>

                    {/* Confidence Visualization */}
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: cyberpunkColors.text.secondary,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          AI Confidence Level
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: getInsightColor(insights[activeInsight].type),
                            fontWeight: 600,
                          }}
                        >
                          {insights[activeInsight].confidence}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={insights[activeInsight].confidence}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(90deg, ${getInsightColor(insights[activeInsight].type)}, ${getInsightColor(insights[activeInsight].type)}80)`,
                            borderRadius: 4,
                            boxShadow: `0 0 12px ${getInsightColor(insights[activeInsight].type)}60`,
                            animation: 'glow 2s infinite alternate',
                          },
                          '@keyframes glow': {
                            '0%': { filter: 'brightness(1)' },
                            '100%': { filter: 'brightness(1.2)' },
                          },
                        }}
                      />
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Insight List */}
          <Grid item xs={12} md={4}>
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {insights.map((insight, index) => (
                <Card
                  key={insight.id}
                  sx={{
                    mb: 1.5,
                    background: index === activeInsight 
                      ? `${getInsightColor(insight.type)}20`
                      : cyberpunkColors.surface.glass,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${getInsightColor(insight.type)}${index === activeInsight ? '60' : '30'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: index === activeInsight ? 'scale(1.02)' : 'scale(1)',
                    '&:hover': {
                      border: `1px solid ${getInsightColor(insight.type)}80`,
                      transform: 'scale(1.02)',
                    },
                  }}
                  onClick={() => setActiveInsight(index)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box
                        sx={{
                          color: getInsightColor(insight.type),
                          mr: 1,
                        }}
                      >
                        {getInsightIcon(insight.type)}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: getInsightColor(insight.type),
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {insight.type}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: cyberpunkColors.text.primary,
                        fontSize: '0.8rem',
                        lineHeight: 1.3,
                        mb: 1,
                      }}
                    >
                      {insight.message.length > 60 
                        ? `${insight.message.substring(0, 60)}...`
                        : insight.message
                      }
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        {formatTimeAgo(insight.timestamp)}
                      </Typography>
                      <Chip
                        label={`${insight.confidence}%`}
                        size="small"
                        sx={{
                          backgroundColor: `${getInsightColor(insight.type)}20`,
                          color: getInsightColor(insight.type),
                          fontSize: '0.6rem',
                          height: 18,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Grid>
        </Grid>

        {insights.length === 0 && (
          <Box textAlign="center" py={6}>
            <Psychology sx={{ fontSize: 80, color: cyberpunkColors.text.secondary, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" mb={1}>
              AI Analysis in Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitoring system patterns and generating insights...
            </Typography>
            <LinearProgress
              sx={{
                mt: 2,
                maxWidth: 200,
                mx: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${cyberpunkColors.secondary.main}, ${cyberpunkColors.primary.main})`,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsSection;