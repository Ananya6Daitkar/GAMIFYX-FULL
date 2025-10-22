import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary',
  onClick
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ fontSize: 16, color: 'var(--color-success)' }} />;
      case 'down':
        return <TrendingDown sx={{ fontSize: 16, color: 'var(--color-error)' }} />;
      case 'stable':
        return <Remove sx={{ fontSize: 16, color: 'var(--color-text-secondary)' }} />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'var(--color-success)';
      case 'down':
        return 'var(--color-error)';
      case 'stable':
        return 'var(--color-text-secondary)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const getColorValue = () => {
    switch (color) {
      case 'success':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--color-warning)';
      case 'error':
        return 'var(--color-error)';
      case 'info':
        return 'var(--color-primary)';
      default:
        return 'var(--color-primary)';
    }
  };

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px ${getColorValue()}30`
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent className="metric-container">
        <Box className="metric-header">
          <Typography className="metric-label">
            {title}
          </Typography>
          {icon && (
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: getColorValue(),
                color: 'white'
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>

        <Typography 
          className="metric-value"
          sx={{ color: getColorValue() }}
        >
          {value}{unit}
        </Typography>

        {subtitle && (
          <Typography className="metric-label">
            {subtitle}
          </Typography>
        )}

        {(trend || trendValue) && (
          <Box 
            className={`metric-change ${trend || 'neutral'}`}
            sx={{ color: getTrendColor() }}
          >
            {getTrendIcon()}
            {trendValue && (
              <Typography variant="caption" sx={{ color: getTrendColor() }}>
                {trendValue}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;