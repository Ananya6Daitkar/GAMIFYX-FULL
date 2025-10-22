/**
 * DevOps Metrics - Real-time system metrics with futuristic design
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface DevOpsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface DevOpsMetricsProps {
  metrics: DevOpsMetric[];
}

const DevOpsMetrics: React.FC<DevOpsMetricsProps> = ({ metrics }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return cyberpunkColors.success.main;
      case 'warning': return cyberpunkColors.warning.main;
      case 'critical': return cyberpunkColors.error.main;
      default: return cyberpunkColors.text.secondary;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'down': return <TrendingDown sx={{ fontSize: 16 }} />;
      case 'stable': return <Remove sx={{ fontSize: 16 }} />;
      default: return <Remove sx={{ fontSize: 16 }} />;
    }
  };

  const getTrendColor = (trend: string, status: string) => {
    if (status === 'critical') return cyberpunkColors.error.main;
    if (status === 'warning') return cyberpunkColors.warning.main;
    
    switch (trend) {
      case 'up': return status === 'good' ? cyberpunkColors.success.main : cyberpunkColors.warning.main;
      case 'down': return status === 'good' ? cyberpunkColors.success.main : cyberpunkColors.error.main;
      case 'stable': return cyberpunkColors.primary.main;
      default: return cyberpunkColors.text.secondary;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}${unit}`;
    if (unit === 'ms') return `${Math.round(value)}${unit}`;
    if (unit === 'req/s') return `${Math.round(value)}${unit}`;
    return `${value.toFixed(2)}${unit}`;
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h5"
          sx={{
            mb: 3,
            color: cyberpunkColors.primary.main,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          REAL-TIME DEVOPS METRICS
        </Typography>

        <div className="dashboard-grid">
          {metrics.map((metric) => (
            <div className="grid-span-3" key={metric.id}>
              <Card
                sx={{
                  background: cyberpunkColors.surface.glass,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${getStatusColor(metric.status)}40`,
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    border: `1px solid ${getStatusColor(metric.status)}80`,
                    boxShadow: `0 8px 25px ${getStatusColor(metric.status)}30`,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${getStatusColor(metric.status)}, transparent)`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Header */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box
                      sx={{
                        color: getStatusColor(metric.status),
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {metric.icon}
                    </Box>
                    <Chip
                      icon={getTrendIcon(metric.trend)}
                      label={metric.trend.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: `${getTrendColor(metric.trend, metric.status)}20`,
                        color: getTrendColor(metric.trend, metric.status),
                        border: `1px solid ${getTrendColor(metric.trend, metric.status)}40`,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        '& .MuiChip-icon': {
                          color: getTrendColor(metric.trend, metric.status),
                        },
                      }}
                    />
                  </Box>

                  {/* Metric Name */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: cyberpunkColors.text.secondary,
                      fontWeight: 500,
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {metric.name}
                  </Typography>

                  {/* Value */}
                  <Typography
                    variant="h4"
                    sx={{
                      color: getStatusColor(metric.status),
                      fontWeight: 700,
                      mb: 1,
                      textShadow: `0 0 10px ${getStatusColor(metric.status)}60`,
                    }}
                  >
                    {formatValue(metric.value, metric.unit)}
                  </Typography>

                  {/* Status Indicator */}
                  <Box
                    sx={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: metric.status === 'good' ? '100%' : metric.status === 'warning' ? '60%' : '30%',
                        background: `linear-gradient(90deg, ${getStatusColor(metric.status)}, ${getStatusColor(metric.status)}80)`,
                        borderRadius: '2px',
                        boxShadow: `0 0 8px ${getStatusColor(metric.status)}60`,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DevOpsMetrics;