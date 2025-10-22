/**
 * Incident Cards - AI-predicted issues with confidence levels
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  Psychology,
  Visibility,
  PlayArrow,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  predictedAt: string;
  affectedSystems: string[];
  aiPrediction: boolean;
}

interface IncidentCardsProps {
  incidents: Incident[];
}

const IncidentCards: React.FC<IncidentCardsProps> = ({ incidents }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return cyberpunkColors.primary.main;
      case 'medium': return cyberpunkColors.warning.main;
      case 'high': return '#FF6B35';
      case 'critical': return cyberpunkColors.error.main;
      default: return cyberpunkColors.text.secondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <Info sx={{ fontSize: 20 }} />;
      case 'medium': return <Warning sx={{ fontSize: 20 }} />;
      case 'high': return <Warning sx={{ fontSize: 20 }} />;
      case 'critical': return <Error sx={{ fontSize: 20 }} />;
      default: return <Info sx={{ fontSize: 20 }} />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Psychology sx={{ color: cyberpunkColors.secondary.main, mr: 2, fontSize: 28 }} />
          <Typography
            variant="h5"
            sx={{
              color: cyberpunkColors.secondary.main,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            AI PREDICTED INCIDENTS
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {incidents.map((incident) => (
            <Card
              key={incident.id}
              sx={{
                mb: 2,
                background: cyberpunkColors.surface.glass,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${getSeverityColor(incident.severity)}40`,
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateX(4px)',
                  border: `1px solid ${getSeverityColor(incident.severity)}80`,
                  boxShadow: `0 4px 20px ${getSeverityColor(incident.severity)}30`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '4px',
                  background: `linear-gradient(180deg, ${getSeverityColor(incident.severity)}, ${getSeverityColor(incident.severity)}80)`,
                },
              }}
            >
              <CardContent sx={{ p: 2.5, pl: 3.5 }}>
                {/* Header */}
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box
                        sx={{
                          color: getSeverityColor(incident.severity),
                          mr: 1,
                        }}
                      >
                        {getSeverityIcon(incident.severity)}
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          color: cyberpunkColors.text.primary,
                          fontWeight: 600,
                          flex: 1,
                        }}
                      >
                        {incident.title}
                      </Typography>
                      {incident.aiPrediction && (
                        <Chip
                          icon={<Psychology sx={{ fontSize: 14 }} />}
                          label="AI"
                          size="small"
                          sx={{
                            backgroundColor: `${cyberpunkColors.secondary.main}20`,
                            color: cyberpunkColors.secondary.main,
                            border: `1px solid ${cyberpunkColors.secondary.main}40`,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      )}
                    </Box>

                    {/* Severity and Time */}
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Chip
                        label={incident.severity.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getSeverityColor(incident.severity)}20`,
                          color: getSeverityColor(incident.severity),
                          border: `1px solid ${getSeverityColor(incident.severity)}40`,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: cyberpunkColors.text.secondary }}
                      >
                        {formatTimeAgo(incident.predictedAt)}
                      </Typography>
                    </Box>

                    {/* Confidence Level */}
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: cyberpunkColors.text.secondary,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          AI Confidence
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: cyberpunkColors.primary.main,
                            fontWeight: 600,
                          }}
                        >
                          {incident.confidence}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={incident.confidence}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(90deg, ${cyberpunkColors.secondary.main}, ${cyberpunkColors.primary.main})`,
                            borderRadius: 3,
                            boxShadow: `0 0 8px ${cyberpunkColors.secondary.main}60`,
                          },
                        }}
                      />
                    </Box>

                    {/* Affected Systems */}
                    <Box mb={2}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: cyberpunkColors.text.secondary,
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          mb: 0.5,
                        }}
                      >
                        Affected Systems
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {incident.affectedSystems.map((system) => (
                          <Chip
                            key={system}
                            label={system}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              color: cyberpunkColors.text.primary,
                              fontSize: '0.7rem',
                              height: 20,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        sx={{
                          color: cyberpunkColors.primary.main,
                          backgroundColor: `${cyberpunkColors.primary.main}20`,
                          border: `1px solid ${cyberpunkColors.primary.main}40`,
                          '&:hover': {
                            backgroundColor: `${cyberpunkColors.primary.main}30`,
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <Visibility sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{
                          color: cyberpunkColors.success.main,
                          backgroundColor: `${cyberpunkColors.success.main}20`,
                          border: `1px solid ${cyberpunkColors.success.main}40`,
                          '&:hover': {
                            backgroundColor: `${cyberpunkColors.success.main}30`,
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <PlayArrow sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {incidents.length === 0 && (
          <Box textAlign="center" py={4}>
            <Psychology sx={{ fontSize: 64, color: cyberpunkColors.text.secondary, mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              No incidents predicted. System running optimally.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default IncidentCards;