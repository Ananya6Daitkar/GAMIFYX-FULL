/**
 * System Health Meter - Futuristic circular progress indicator
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

interface SystemHealthMeterProps {
  health: number;
}

const SystemHealthMeter: React.FC<SystemHealthMeterProps> = ({ health }) => {
  const [animatedHealth, setAnimatedHealth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHealth(health);
    }, 500);
    return () => clearTimeout(timer);
  }, [health]);

  const getHealthColor = (value: number) => {
    if (value >= 90) return cyberpunkColors.success.main;
    if (value >= 70) return cyberpunkColors.warning.main;
    return cyberpunkColors.error.main;
  };

  const getHealthIcon = (value: number) => {
    if (value >= 90) return <CheckCircle sx={{ fontSize: 40, color: cyberpunkColors.success.main }} />;
    if (value >= 70) return <Warning sx={{ fontSize: 40, color: cyberpunkColors.warning.main }} />;
    return <Error sx={{ fontSize: 40, color: cyberpunkColors.error.main }} />;
  };

  const getHealthStatus = (value: number) => {
    if (value >= 95) return 'OPTIMAL';
    if (value >= 90) return 'EXCELLENT';
    if (value >= 80) return 'GOOD';
    if (value >= 70) return 'WARNING';
    return 'CRITICAL';
  };

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          background: `linear-gradient(135deg, ${getHealthColor(health)}40, transparent)`,
          borderRadius: '18px',
          zIndex: -1,
          animation: 'pulse 2s infinite',
        },
        '@keyframes pulse': {
          '0%': { opacity: 0.5 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.5 },
        },
      }}
    >
      <CardContent sx={{ textAlign: 'center', p: 4 }}>
        <Typography
          variant="h5"
          sx={{
            mb: 3,
            color: cyberpunkColors.primary.main,
            fontWeight: 600,
            letterSpacing: '0.1em',
          }}
        >
          SYSTEM HEALTH
        </Typography>

        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            mb: 3,
          }}
        >
          {/* Background Circle */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={200}
            thickness={4}
            sx={{
              color: 'rgba(255, 255, 255, 0.1)',
              position: 'absolute',
            }}
          />
          
          {/* Health Circle */}
          <CircularProgress
            variant="determinate"
            value={animatedHealth}
            size={200}
            thickness={4}
            sx={{
              color: getHealthColor(health),
              filter: `drop-shadow(0 0 10px ${getHealthColor(health)}80)`,
              transition: 'all 0.3s ease',
            }}
          />
          
          {/* Center Content */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {getHealthIcon(health)}
            <Typography
              variant="h2"
              sx={{
                color: getHealthColor(health),
                fontWeight: 700,
                mt: 1,
                textShadow: `0 0 20px ${getHealthColor(health)}80`,
              }}
            >
              {Math.round(animatedHealth)}%
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h6"
          sx={{
            color: getHealthColor(health),
            fontWeight: 600,
            letterSpacing: '0.05em',
            textShadow: `0 0 10px ${getHealthColor(health)}60`,
          }}
        >
          {getHealthStatus(health)}
        </Typography>

        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          <Box className="metric-container text-center-override" sx={{ minHeight: 'auto', padding: 1 }}>
            <Typography className="metric-label">
              UPTIME
            </Typography>
            <Typography className="metric-value" sx={{ fontSize: 'var(--font-size-lg)' }}>
              99.97%
            </Typography>
          </Box>
          <Box className="metric-container text-center-override" sx={{ minHeight: 'auto', padding: 1 }}>
            <Typography className="metric-label">
              INCIDENTS
            </Typography>
            <Typography className="metric-value" sx={{ fontSize: 'var(--font-size-lg)' }}>
              2 ACTIVE
            </Typography>
          </Box>
          <Box className="metric-container text-center-override" sx={{ minHeight: 'auto', padding: 1 }}>
            <Typography className="metric-label">
              RESPONSE
            </Typography>
            <Typography className="metric-value" sx={{ fontSize: 'var(--font-size-lg)' }}>
              245ms
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SystemHealthMeter;