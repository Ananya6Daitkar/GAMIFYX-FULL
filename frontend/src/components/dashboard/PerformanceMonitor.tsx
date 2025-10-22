/**
 * Performance Monitor Component - Shows dashboard performance metrics
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent
} from '@mui/material';
import {
  Speed,
  Memory,
  NetworkCheck,
  Error,
  Info,
  Warning,
  CheckCircle,
  Close
} from '@mui/icons-material';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

interface PerformanceMonitorProps {
  componentName: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ componentName }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { metrics, insights, score, isHealthy } = usePerformanceMonitoring(componentName);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle />;
    if (score >= 60) return <Warning />;
    return <Error />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes;
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <>
      {/* Performance Indicator */}
      <Tooltip title={`Performance Score: ${score}/100`}>
        <Chip
          icon={getScoreIcon(score)}
          label={`${score}`}
          color={getScoreColor(score) as any}
          size="small"
          onClick={() => setShowDetails(true)}
          sx={{ cursor: 'pointer' }}
        />
      </Tooltip>

      {/* Performance Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Performance Monitor - {componentName}
            </Typography>
            <IconButton onClick={() => setShowDetails(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Overall Score */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {getScoreIcon(score)}
                <Typography variant="h4" color={`${getScoreColor(score)}.main`}>
                  {score}/100
                </Typography>
                <Box flexGrow={1}>
                  <Typography variant="h6">Performance Score</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={score}
                    color={getScoreColor(score) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isHealthy ? 'Dashboard is performing well' : 'Dashboard performance needs attention'}
              </Typography>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Speed color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{formatTime(metrics.loadTime)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Load Time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Speed color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{formatTime(metrics.renderTime)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Render Time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Memory color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{formatBytes(metrics.memoryUsage)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Memory Usage
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <NetworkCheck color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{formatTime(metrics.connectionLatency)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Network Latency
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Error Count */}
          {metrics.errorCount > 0 && (
            <Card sx={{ mb: 3, bgcolor: 'error.50' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Error color="error" />
                  <Typography variant="h6" color="error">
                    {metrics.errorCount} Error{metrics.errorCount !== 1 ? 's' : ''} Detected
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Check the browser console for detailed error information.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Performance Insights */}
          {insights.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Insights
                </Typography>
                <List dense>
                  {insights.map((insight, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText primary={insight} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Performance Tips */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Tips
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Close unused browser tabs to free up memory"
                    secondary="Other tabs can consume resources and slow down the dashboard"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Use a stable internet connection"
                    secondary="Poor connectivity affects real-time updates and data loading"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Keep your browser updated"
                    secondary="Newer browser versions have better performance optimizations"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PerformanceMonitor;