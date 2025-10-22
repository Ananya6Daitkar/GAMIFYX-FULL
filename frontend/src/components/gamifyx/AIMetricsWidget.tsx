/**
 * AI Metrics Widget - Compact AI service metrics display
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Psychology,
  CheckCircle,
  Warning,
  Error,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface AIMetricsWidgetProps {
  feedbackAccuracy: number;
  modelConfidence: number;
  serviceHealth: 'healthy' | 'warning' | 'critical';
  driftScore: number;
  compact?: boolean;
}

const AIMetricsWidget: React.FC<AIMetricsWidgetProps> = ({
  feedbackAccuracy,
  modelConfidence,
  serviceHealth,
  driftScore,
  compact = false,
}) => {
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
      case 'healthy': return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'warning': return <Warning sx={{ fontSize: 16 }} />;
      case 'critical': return <Error sx={{ fontSize: 16 }} />;
      default: return <Psychology sx={{ fontSize: 16 }} />;
    }
  };

  const getDriftIcon = () => {
    return driftScore > 0.5 ? (
      <TrendingDown sx={{ fontSize: 16, color: cyberpunkColors.error.main }} />
    ) : (
      <TrendingUp sx={{ fontSize: 16, color: cyberpunkColors.success.main }} />
    );
  };

  if (compact) {
    return (
      <Card
        sx={{
          background: cyberpunkColors.surface.glass,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${cyberpunkColors.secondary.main}30`,
          borderRadius: '8px',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Psychology sx={{ color: cyberpunkColors.secondary.main, mr: 1, fontSize: 20 }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: cyberpunkColors.text.primary,
                fontWeight: 600,
              }}
            >
              AI Metrics
            </Typography>
          </Box>

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Box textAlign="center">
                <Typography
                  variant="h6"
                  sx={{
                    color: cyberpunkColors.primary.main,
                    fontWeight: 700,
                  }}
                >
                  {feedbackAccuracy}%
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: cyberpunkColors.text.secondary }}
                >
                  Accuracy
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box textAlign="center" display="flex" alignItems="center" justifyContent="center">
                {getHealthIcon(serviceHealth)}
                <Typography
                  variant="caption"
                  sx={{
                    color: getHealthColor(serviceHealth),
                    ml: 0.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {serviceHealth}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        background: cyberpunkColors.surface.glass,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${cyberpunkColors.secondary.main}40`,
        borderRadius: '12px',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Psychology sx={{ color: cyberpunkColors.secondary.main, mr: 2, fontSize: 24 }} />
          <Typography
            variant="h6"
            sx={{
              color: cyberpunkColors.text.primary,
              fontWeight: 600,
            }}
          >
            AI Service Status
          </Typography>
          <Chip
            icon={getHealthIcon(serviceHealth)}
            label={serviceHealth.toUpperCase()}
            sx={{
              ml: 'auto',
              backgroundColor: `${getHealthColor(serviceHealth)}20`,
              color: getHealthColor(serviceHealth),
              border: `1px solid ${getHealthColor(serviceHealth)}40`,
              fontSize: '0.7rem',
            }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography
                  variant="body2"
                  sx={{ color: cyberpunkColors.text.secondary }}
                >
                  Feedback Accuracy
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: cyberpunkColors.text.primary, fontWeight: 600 }}
                >
                  {feedbackAccuracy}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={feedbackAccuracy}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: feedbackAccuracy > 80 
                      ? cyberpunkColors.success.main
                      : feedbackAccuracy > 60
                      ? cyberpunkColors.warning.main
                      : cyberpunkColors.error.main,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography
                  variant="body2"
                  sx={{ color: cyberpunkColors.text.secondary }}
                >
                  Model Confidence
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: cyberpunkColors.text.primary, fontWeight: 600 }}
                >
                  {modelConfidence}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={modelConfidence}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: cyberpunkColors.primary.main,
                    borderRadius: 3,
                    boxShadow: `0 0 8px ${cyberpunkColors.primary.main}60`,
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography
                  variant="body2"
                  sx={{ color: cyberpunkColors.text.secondary }}
                >
                  Model Drift Score
                </Typography>
                <Box display="flex" alignItems="center">
                  {getDriftIcon()}
                  <Typography
                    variant="body2"
                    sx={{ 
                      color: cyberpunkColors.text.primary, 
                      fontWeight: 600,
                      ml: 0.5,
                    }}
                  >
                    {(driftScore * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={driftScore * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: driftScore > 0.5 
                      ? cyberpunkColors.error.main
                      : driftScore > 0.3
                      ? cyberpunkColors.warning.main
                      : cyberpunkColors.success.main,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AIMetricsWidget;