import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Fade } from '@mui/material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

const SimpleDashboard: React.FC = () => {
  const [animationTrigger, setAnimationTrigger] = useState(false);

  useEffect(() => {
    setAnimationTrigger(true);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: cyberpunkColors.gradients.primary,
        position: 'relative',
        overflow: 'hidden',
        p: 3,
      }}
    >
      {/* Header */}
      <Fade in={animationTrigger} timeout={1000}>
        <Box mb={4}>
          <Typography
            variant="h1"
            sx={{
              background: `linear-gradient(135deg, ${cyberpunkColors.primary.main} 0%, ${cyberpunkColors.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
              mb: 1,
            }}
          >
            GAMIFYX
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: cyberpunkColors.text.secondary,
              textAlign: 'center',
              fontWeight: 300,
              letterSpacing: '0.1em',
            }}
          >
            AIOps DevOps Gamification Platform
          </Typography>
        </Box>
      </Fade>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box
            sx={{
              background: 'rgba(20, 20, 35, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              borderRadius: '16px',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" sx={{ color: cyberpunkColors.primary.main, mb: 2 }}>
              🚀 Dashboard Loading Successfully! 🚀
            </Typography>
            <Typography variant="h5" sx={{ color: cyberpunkColors.text.primary, mb: 3 }}>
              All components are ready to load
            </Typography>
            <Typography variant="body1" sx={{ color: cyberpunkColors.text.secondary }}>
              System Health: 94% | Team Members: 3 | Active Incidents: 2
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimpleDashboard;