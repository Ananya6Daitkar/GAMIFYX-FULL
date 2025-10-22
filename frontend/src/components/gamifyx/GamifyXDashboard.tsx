/**
 * GamifyX Main Dashboard - Futuristic AIOps Gamification Platform
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Speed,
  Warning,
  Memory,
  NetworkCheck,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';
import SystemHealthMeter from './SystemHealthMeter';
import TeamLeaderboard from './TeamLeaderboard';
import IncidentCards from './IncidentCards';
import AchievementPanel from './AchievementPanel';
import AIInsightsSection from './AIInsightsSection';
import DevOpsMetrics from './DevOpsMetrics';
import PerformancePredictionPanel from './PerformancePredictionPanel';
import AIMetricsDashboard from './AIMetricsDashboard';
import FloatingParticles from './FloatingParticles';
import { gamifyxApi, DashboardData, StudentPrediction, AIMetrics } from '../../services/gamifyxApi';
import { websocketService } from '../../services/websocketService';
import { transformDashboardData } from '../../services/dataTransformers';

interface DashboardData {
  systemHealth: number;
  teamMembers: TeamMember[];
  incidents: Incident[];
  achievements: Achievement[];
  metrics: DevOpsMetric[];
  aiInsights: AIInsight[];
  performancePredictions: StudentPrediction[];
  aiMetrics: AIMetrics;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  rank: number;
  badges: Badge[];
  streak: number;
  status: 'online' | 'away' | 'offline';
}

interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  predictedAt: string;
  affectedSystems: string[];
  aiPrediction: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface DevOpsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface AIInsight {
  id: string;
  type: 'anomaly' | 'prediction' | 'optimization';
  message: string;
  confidence: number;
  timestamp: string;
}

const GamifyXDashboard: React.FC = () => {
  console.log('GamifyXDashboard component is rendering');
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [aiMetricsLoading, setAiMetricsLoading] = useState(false);

  const [animationTrigger, setAnimationTrigger] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dashboardResponse, predictionsResponse, aiMetricsResponse] = await Promise.all([
        gamifyxApi.getDashboardData(),
        gamifyxApi.getPerformancePredictions(),
        gamifyxApi.getAIMetrics()
      ]);
      
      if (dashboardResponse.success) {
        // Transform the raw API data to frontend format
        const transformedData = transformDashboardData(dashboardResponse.data);
        
        // Add performance predictions and AI metrics to dashboard data
        const enhancedData = {
          ...transformedData,
          performancePredictions: predictionsResponse.success ? predictionsResponse.data : [],
          aiMetrics: aiMetricsResponse.success ? aiMetricsResponse.data : {
            feedbackGeneration: { totalRequests: 0, successRate: 0, averageResponseTime: 0, accuracyScore: 0, implementationRate: 0 },
            modelPrediction: { totalPredictions: 0, averageConfidence: 0, accuracyTrend: [], driftScore: 0, lastTrainingDate: new Date().toISOString() },
            serviceHealth: { status: 'healthy' as const, uptime: 0, cpuUsage: 0, memoryUsage: 0, errorRate: 0, responseTime: 0 },
            optimizations: []
          }
        };
        
        setDashboardData(enhancedData);
        setAnimationTrigger(true);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(gamifyxApi.handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Refresh performance predictions
  const refreshPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const response = await gamifyxApi.refreshPredictions();
      
      if (response.success && dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          performancePredictions: response.data
        } : null);
        
        setNotification({
          message: '🔄 Performance predictions updated successfully!',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Error refreshing predictions:', err);
      setNotification({
        message: 'Failed to refresh predictions',
        type: 'error'
      });
    } finally {
      setPredictionsLoading(false);
    }
  };

  // Refresh AI metrics
  const refreshAIMetrics = async () => {
    try {
      setAiMetricsLoading(true);
      const response = await gamifyxApi.refreshAIMetrics();
      
      if (response.success && dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          aiMetrics: response.data
        } : null);
        
        setNotification({
          message: '🤖 AI metrics updated successfully!',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Error refreshing AI metrics:', err);
      setNotification({
        message: 'Failed to refresh AI metrics',
        type: 'error'
      });
    } finally {
      setAiMetricsLoading(false);
    }
  };

  useEffect(() => {
    // Load initial data
    loadDashboardData();

    // Request notification permission
    websocketService.requestNotificationPermission();

    // Set up WebSocket event listeners
    const handleSystemHealthUpdate = (data: any) => {
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          systemHealth: {
            ...prev.systemHealth,
            score: data.data.score || data.data.systemHealth || prev.systemHealth.score
          }
        } : null);
      }
    };

    const handleMetricsUpdate = (data: any) => {
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          metrics: prev.metrics.map(metric => {
            switch (metric.name) {
              case 'CPU Usage':
                return { ...metric, value: data.data.cpu || metric.value };
              case 'Response Time':
                return { ...metric, value: data.data.responseTime || metric.value };
              case 'Error Rate':
                return { ...metric, value: data.data.errorRate || metric.value };
              case 'Throughput':
                return { ...metric, value: data.data.throughput || metric.value };
              default:
                return metric;
            }
          })
        } : null);
      }
    };

    const handleAchievementUnlocked = (data: any) => {
      setNotification({
        message: `🎉 Achievement Unlocked: ${data.achievement.title}!`,
        type: 'success'
      });
    };

    const handleIncidentPrediction = (data: any) => {
      setNotification({
        message: `⚠️ New Incident Predicted: ${data.incident.title}`,
        type: 'error'
      });
      
      // Add incident to dashboard data
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          incidents: [data.incident, ...prev.incidents]
        } : null);
      }
    };

    const handleAIInsight = (data: any) => {
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          aiInsights: [data.insight, ...prev.aiInsights.slice(0, 4)] // Keep only 5 most recent
        } : null);
      }
    };

    const handleLeaderboardUpdate = (data: any) => {
      if (dashboardData && data.data.topPlayers) {
        setDashboardData(prev => prev ? {
          ...prev,
          teamMembers: data.data.topPlayers.map((player: any, index: number) => ({
            ...player,
            rank: index + 1,
            avatar: player.avatar || '/avatars/placeholder.svg',
            badges: player.badges || [],
            status: player.status || 'online'
          }))
        } : null);
      }
    };

    const handleBadgeEarned = (data: any) => {
      setNotification({
        message: `🏆 Badge Earned: ${data.badge.name}!`,
        type: 'success'
      });
    };

    const handleLevelUp = (data: any) => {
      setNotification({
        message: `🚀 Level Up! You've reached level ${data.level}!`,
        type: 'success'
      });
    };

    const handleSystemAlert = (data: any) => {
      if (data.alert.severity === 'critical') {
        setNotification({
          message: `🚨 Critical Alert: ${data.alert.message}`,
          type: 'error'
        });
      }
    };

    const handlePerformancePredictionUpdate = (data: any) => {
      if (dashboardData && data.prediction) {
        setDashboardData(prev => prev ? {
          ...prev,
          performancePredictions: prev.performancePredictions.map(p => 
            p.userId === data.prediction.userId ? data.prediction : p
          )
        } : null);
      }
    };

    const handleRiskAlert = (data: any) => {
      if (data.student && data.riskScore >= 0.7) {
        setNotification({
          message: `⚠️ High Risk Alert: ${data.student.name} needs intervention`,
          type: 'error'
        });
      }
    };

    const handleAIMetricsUpdate = (data: any) => {
      if (dashboardData && data.metrics) {
        setDashboardData(prev => prev ? {
          ...prev,
          aiMetrics: data.metrics
        } : null);
      }
    };

    const handleAIServiceAlert = (data: any) => {
      if (data.alert && data.alert.severity === 'critical') {
        setNotification({
          message: `🤖 AI Service Alert: ${data.alert.message}`,
          type: 'error'
        });
      }
    };

    const handleModelDriftAlert = (data: any) => {
      if (data.driftScore > 0.5) {
        setNotification({
          message: `📊 Model Drift Detected: Retraining recommended`,
          type: 'error'
        });
      }
    };

    // Subscribe to WebSocket events
    websocketService.on('system:health:update', handleSystemHealthUpdate);
    websocketService.on('metrics:update', handleMetricsUpdate);
    websocketService.on('achievement:unlocked', handleAchievementUnlocked);
    websocketService.on('incident:prediction', handleIncidentPrediction);
    websocketService.on('ai:insight', handleAIInsight);
    websocketService.on('leaderboard:update', handleLeaderboardUpdate);
    websocketService.on('badge:earned', handleBadgeEarned);
    websocketService.on('level:up', handleLevelUp);
    websocketService.on('system:alert', handleSystemAlert);
    websocketService.on('performance:prediction:update', handlePerformancePredictionUpdate);
    websocketService.on('risk:alert', handleRiskAlert);
    websocketService.on('ai:metrics:update', handleAIMetricsUpdate);
    websocketService.on('ai:service:alert', handleAIServiceAlert);
    websocketService.on('model:drift:alert', handleModelDriftAlert);

    // Cleanup
    return () => {
      websocketService.off('system:health:update', handleSystemHealthUpdate);
      websocketService.off('metrics:update', handleMetricsUpdate);
      websocketService.off('achievement:unlocked', handleAchievementUnlocked);
      websocketService.off('incident:prediction', handleIncidentPrediction);
      websocketService.off('ai:insight', handleAIInsight);
      websocketService.off('leaderboard:update', handleLeaderboardUpdate);
      websocketService.off('badge:earned', handleBadgeEarned);
      websocketService.off('level:up', handleLevelUp);
      websocketService.off('system:alert', handleSystemAlert);
      websocketService.off('performance:prediction:update', handlePerformancePredictionUpdate);
      websocketService.off('risk:alert', handleRiskAlert);
      websocketService.off('ai:metrics:update', handleAIMetricsUpdate);
      websocketService.off('ai:service:alert', handleAIServiceAlert);
      websocketService.off('model:drift:alert', handleModelDriftAlert);
    };
  }, [dashboardData]);

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: cyberpunkColors.gradients.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <CircularProgress 
          size={80} 
          sx={{ 
            color: cyberpunkColors.primary.main,
            mb: 3,
            filter: `drop-shadow(0 0 10px ${cyberpunkColors.primary.main}80)`
          }} 
        />
        <Typography 
          variant="h4" 
          sx={{ 
            color: cyberpunkColors.primary.main,
            textAlign: 'center',
            fontWeight: 600,
            letterSpacing: '0.1em',
          }}
        >
          INITIALIZING GAMIFYX...
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: cyberpunkColors.text.secondary,
            textAlign: 'center',
            mt: 1,
          }}
        >
          Loading cyberpunk dashboard systems
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: cyberpunkColors.gradients.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          p: 3,
        }}
      >
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            backgroundColor: `${cyberpunkColors.error.main}20`,
            color: cyberpunkColors.error.main,
            border: `1px solid ${cyberpunkColors.error.main}40`,
          }}
        >
          {error}
        </Alert>
        <Typography 
          variant="h4" 
          sx={{ 
            color: cyberpunkColors.error.main,
            textAlign: 'center',
            fontWeight: 600,
            letterSpacing: '0.1em',
            mb: 2,
          }}
        >
          SYSTEM ERROR
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: cyberpunkColors.text.secondary,
            textAlign: 'center',
            mb: 3,
          }}
        >
          Failed to initialize GamifyX dashboard
        </Typography>
      </Box>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: cyberpunkColors.gradients.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h4" sx={{ color: cyberpunkColors.text.secondary }}>
          No dashboard data available
        </Typography>
      </Box>
    );
  }

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
      <FloatingParticles />
      
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

      <div className="dashboard-grid prevent-overflow">
        {/* System Health Meter */}
        <div className="grid-span-4">
          <Zoom in={animationTrigger} timeout={1200}>
            <Box>
              <SystemHealthMeter health={dashboardData.systemHealth.score} />
            </Box>
          </Zoom>
        </div>

        {/* Team Leaderboard */}
        <div className="grid-span-8">
          <Zoom in={animationTrigger} timeout={1400}>
            <Box>
              <TeamLeaderboard members={dashboardData.teamMembers} />
            </Box>
          </Zoom>
        </div>

        {/* DevOps Metrics */}
        <div className="grid-span-12">
          <Fade in={animationTrigger} timeout={1600}>
            <Box>
              <DevOpsMetrics metrics={dashboardData.metrics} />
            </Box>
          </Fade>
        </div>

        {/* Incident Cards */}
        <div className="grid-span-6">
          <Zoom in={animationTrigger} timeout={1800}>
            <Box>
              <IncidentCards incidents={dashboardData.incidents} />
            </Box>
          </Zoom>
        </div>

        {/* Achievement Panel */}
        <div className="grid-span-6">
          <Zoom in={animationTrigger} timeout={2000}>
            <Box>
              <AchievementPanel achievements={dashboardData.achievements} />
            </Box>
          </Zoom>
        </div>

        {/* AI Insights Section */}
        <div className="grid-span-12">
          <Fade in={animationTrigger} timeout={2200}>
            <Box>
              <AIInsightsSection insights={dashboardData.aiInsights} />
            </Box>
          </Fade>
        </div>

        {/* Performance Prediction Panel */}
        <div className="grid-span-12">
          <Fade in={animationTrigger} timeout={2400}>
            <Box>
              <PerformancePredictionPanel 
                predictions={dashboardData.performancePredictions}
                onRefresh={refreshPredictions}
                loading={predictionsLoading}
              />
            </Box>
          </Fade>
        </div>

        {/* AI Metrics Dashboard */}
        <div className="grid-span-12">
          <Fade in={animationTrigger} timeout={2600}>
            <Box>
              <AIMetricsDashboard 
                metrics={dashboardData.aiMetrics}
                onRefresh={refreshAIMetrics}
                loading={aiMetricsLoading}
              />
            </Box>
          </Fade>
        </div>
      </div>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.type || 'info'}
          sx={{
            backgroundColor: notification?.type === 'success' 
              ? `${cyberpunkColors.success.main}20`
              : notification?.type === 'error'
              ? `${cyberpunkColors.error.main}20`
              : `${cyberpunkColors.primary.main}20`,
            color: notification?.type === 'success' 
              ? cyberpunkColors.success.main
              : notification?.type === 'error'
              ? cyberpunkColors.error.main
              : cyberpunkColors.primary.main,
            border: `1px solid ${
              notification?.type === 'success' 
                ? cyberpunkColors.success.main
                : notification?.type === 'error'
                ? cyberpunkColors.error.main
                : cyberpunkColors.primary.main
            }40`,
          }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GamifyXDashboard;