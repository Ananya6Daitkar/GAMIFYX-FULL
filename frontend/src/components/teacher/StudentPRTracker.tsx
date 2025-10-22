/**
 * Student PR Tracker Component - Displays individual student PR counts and activity
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert
} from '@mui/material';
import { formatRelativeDate } from '../../utils/dateUtils';
import {
  GitHub,
  TrendingUp,
  TrendingDown,
  Remove,
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Refresh,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import { StudentPRStats, PullRequest, ProgressInsight } from '../../types/github';

interface StudentPRTrackerProps {
  studentId: string;
  teacherId: string;
  showDetails?: boolean;
  onViewDetails?: (studentId: string) => void;
  onRefresh?: () => void;
}

const StudentPRTracker: React.FC<StudentPRTrackerProps> = ({
  studentId,
  teacherId,
  showDetails = false,
  onViewDetails,
  onRefresh
}) => {
  const [stats, setStats] = useState<StudentPRStats | null>(null);
  const [recentPRs, setRecentPRs] = useState<PullRequest[]>([]);
  const [insights, setInsights] = useState<ProgressInsight[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentPRStats();
    if (showDetails) {
      fetchRecentPRs();
      fetchInsights();
    }
  }, [studentId, teacherId, showDetails]);

  const fetchStudentPRStats = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/v1/github/student-stats?studentId=${studentId}&teacherId=${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to fetch PR stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Mock data for development
      setStats({
        studentId,
        githubUsername: 'student_' + studentId.slice(-4),
        totalPRs: Math.floor(Math.random() * 50) + 5,
        mergedPRs: Math.floor(Math.random() * 30) + 3,
        openPRs: Math.floor(Math.random() * 5),
        prsThisWeek: Math.floor(Math.random() * 8),
        prsThisMonth: Math.floor(Math.random() * 20) + 5,
        lastPRDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        avgPRSize: Math.floor(Math.random() * 200) + 50,
        trend: {
          direction: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
          percentage: Math.floor(Math.random() * 50) + 10,
          timeframe: '2 weeks'
        },
        progressScore: Math.floor(Math.random() * 40) + 60
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPRs = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/v1/github/student-prs?studentId=${studentId}&teacherId=${teacherId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setRecentPRs(data);
      }
    } catch (err) {
      // Mock data for development
      const mockPRs: PullRequest[] = Array.from({ length: 3 }, (_, i) => ({
        id: `pr_${i}`,
        studentUsername: 'student_' + studentId.slice(-4),
        repository: `project-${i + 1}`,
        repositoryUrl: `https://github.com/teacher/project-${i + 1}`,
        prNumber: Math.floor(Math.random() * 100) + 1,
        title: `Feature: Add ${['authentication', 'dashboard', 'API'][i]} functionality`,
        url: `https://github.com/teacher/project-${i + 1}/pull/${Math.floor(Math.random() * 100) + 1}`,
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        status: ['open', 'merged', 'closed'][Math.floor(Math.random() * 3)] as any,
        commitCount: Math.floor(Math.random() * 10) + 1,
        linesAdded: Math.floor(Math.random() * 200) + 20,
        linesDeleted: Math.floor(Math.random() * 50) + 5,
        linesChanged: 0,
        filesChanged: Math.floor(Math.random() * 8) + 1,
        reviewComments: Math.floor(Math.random() * 5),
        isDraft: Math.random() > 0.8
      }));
      mockPRs.forEach(pr => {
        pr.linesChanged = pr.linesAdded + pr.linesDeleted;
      });
      setRecentPRs(mockPRs);
    }
  };

  const fetchInsights = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/v1/github/student-insights?studentId=${studentId}&teacherId=${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (err) {
      // Mock insights for development
      const mockInsights: ProgressInsight[] = [
        {
          type: 'positive',
          category: 'activity',
          message: 'Great PR activity this week!',
          impact: 'medium',
          confidence: 0.8
        },
        {
          type: 'warning',
          category: 'consistency',
          message: 'Consider more frequent, smaller commits',
          impact: 'low',
          confidence: 0.6
        }
      ];
      setInsights(mockInsights);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp color="success" />;
      case 'declining':
        return <TrendingDown color="error" />;
      default:
        return <Remove color="disabled" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving':
        return 'success';
      case 'declining':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'merged':
        return 'success';
      case 'open':
        return 'info';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };



  const handleRefresh = () => {
    fetchStudentPRStats();
    if (showDetails) {
      fetchRecentPRs();
      fetchInsights();
    }
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar>
              <GitHub />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">Loading...</Typography>
              <LinearProgress />
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }>
            Failed to load PR data: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No GitHub data available for this student
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <GitHub />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {stats.githubUsername}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GitHub Activity
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
            {onViewDetails && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onViewDetails(studentId)}
              >
                View Details
              </Button>
            )}
          </Box>
        </Box>

        {/* Key Metrics */}
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Box textAlign="center">
            <Typography variant="h4" color="primary">
              {stats.totalPRs}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total PRs
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="success.main">
              {stats.mergedPRs}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Merged
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="info.main">
              {stats.openPRs}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Open
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="warning.main">
              {stats.prsThisWeek}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This Week
            </Typography>
          </Box>
        </Box>

        {/* Progress Score */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">
              Progress Score
            </Typography>
            <Typography variant="body2" color={`${getProgressColor(stats.progressScore)}.main`}>
              {stats.progressScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={stats.progressScore}
            color={getProgressColor(stats.progressScore) as any}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Trend and Last Activity */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Chip
            icon={getTrendIcon(stats.trend.direction)}
            label={`${stats.trend.direction} ${stats.trend.percentage}%`}
            color={getTrendColor(stats.trend.direction) as any}
            size="small"
          />
          <Typography variant="caption" color="text.secondary">
            Last PR: {stats.lastPRDate ? formatRelativeDate(stats.lastPRDate) : 'Never'}
          </Typography>
        </Box>

        {/* Insights */}
        {insights.length > 0 && (
          <Box mb={2}>
            {insights.map((insight, index) => (
              <Alert
                key={index}
                severity={insight.type === 'positive' ? 'success' : 
                         insight.type === 'warning' ? 'warning' : 
                         insight.type === 'negative' ? 'error' : 'info'}
                sx={{ mb: 1, fontSize: '0.875rem' }}
              >
                {insight.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Expandable Details */}
        {showDetails && (
          <>
            <Button
              fullWidth
              variant="text"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 1 }}
            >
              {expanded ? 'Hide' : 'Show'} Recent PRs
            </Button>
            
            <Collapse in={expanded}>
              <Divider sx={{ mb: 2 }} />
              
              {recentPRs.length > 0 ? (
                <List dense>
                  {recentPRs.map((pr) => (
                    <ListItem
                      key={pr.id}
                      divider
                      secondaryAction={
                        <Tooltip title="Open in GitHub">
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => window.open(pr.url, '_blank')}
                          >
                            <OpenInNew />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: `${getStatusColor(pr.status)}.main` }}>
                          {pr.status === 'merged' ? <CheckCircle /> : 
                           pr.status === 'open' ? <GitHub /> : <Warning />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" noWrap>
                              {pr.title}
                            </Typography>
                            <Chip
                              label={pr.status}
                              size="small"
                              color={getStatusColor(pr.status) as any}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {pr.repository} • PR #{pr.prNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeDate(pr.createdAt)} • +{pr.linesAdded} -{pr.linesDeleted} lines
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No recent pull requests found
                </Typography>
              )}
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentPRTracker;