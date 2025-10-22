import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  Chip,
  Avatar,
  Grid,
  Paper,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Badge,
  Fade,
  Zoom
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncompletedIcon,
  Star as StarIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingUpIcon,
  LocalFireDepartment as FireIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Launch as LaunchIcon,
  Verified as VerifiedIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Participation,
  Competition,
  CompetitionType,
  ParticipationStatus,
  Milestone,
  RequirementProgress,
  ProgressTrackingData
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

// Cyberpunk-themed animations
const glowPulse = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(255, 0, 255, 0.3); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
`;

const neonGlow = keyframes`
  0% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.8); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 1), 0 0 15px rgba(255, 0, 255, 0.5); }
  100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.8); }
`;

const progressFill = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0%); }
`;

interface CompetitionProgressWidgetProps {
  participationId: string;
  showMilestones?: boolean;
  showRequirements?: boolean;
  compact?: boolean;
  animated?: boolean;
}

interface ProgressStats {
  totalProgress: number;
  completedRequirements: number;
  totalRequirements: number;
  milestonesAchieved: number;
  totalMilestones: number;
  currentStreak: number;
  pointsEarned: number;
  estimatedCompletion: string | null;
  timeRemaining: string | null;
}

const CompetitionProgressWidget: React.FC<CompetitionProgressWidgetProps> = ({
  participationId,
  showMilestones = true,
  showRequirements = true,
  compact = false,
  animated = true
}) => {
  const theme = useTheme();
  const [progressData, setProgressData] = useState<ProgressTrackingData | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadProgressData();
    
    // Set up auto-refresh for real-time updates
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadProgressData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [participationId, autoRefresh]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [progressResponse, participationResponse] = await Promise.all([
        competitionApi.getProgressTracking(participationId),
        competitionApi.getParticipation(participationId)
      ]);

      setProgressData(progressResponse);
      setParticipation(participationResponse);

      // Load competition details
      const competitionResponse = await competitionApi.getCompetition(participationResponse.competitionId);
      setCompetition(competitionResponse);

      // Calculate progress statistics
      const stats = calculateProgressStats(progressResponse, participationResponse, competitionResponse);
      setStats(stats);

    } catch (err: any) {
      setError(err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgressStats = (
    progress: ProgressTrackingData,
    participation: Participation,
    competition: Competition
  ): ProgressStats => {
    const completedRequirements = progress.requirements.filter(r => r.completed).length;
    const totalRequirements = progress.requirements.length;
    const milestonesAchieved = progress.milestones.filter(m => m.achieved).length;
    const totalMilestones = progress.milestones.length;
    
    const totalProgress = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;
    const pointsEarned = participation.totalScore;
    
    // Calculate estimated completion based on current progress rate
    const daysParticipated = differenceInDays(new Date(), parseISO(participation.registeredAt));
    const progressRate = daysParticipated > 0 ? totalProgress / daysParticipated : 0;
    const remainingProgress = 100 - totalProgress;
    const estimatedDaysToComplete = progressRate > 0 ? Math.ceil(remainingProgress / progressRate) : null;
    
    // Calculate time remaining until competition ends
    const endDate = parseISO(competition.endDate);
    const daysRemaining = differenceInDays(endDate, new Date());
    
    return {
      totalProgress,
      completedRequirements,
      totalRequirements,
      milestonesAchieved,
      totalMilestones,
      currentStreak: participation.progress.currentStreak,
      pointsEarned,
      estimatedCompletion: estimatedDaysToComplete ? `${estimatedDaysToComplete} days` : null,
      timeRemaining: daysRemaining > 0 ? `${daysRemaining} days` : 'Ended'
    };
  };

  const getCompetitionTypeIcon = (type: CompetitionType) => {
    switch (type) {
      case CompetitionType.HACKTOBERFEST:
        return '🎃';
      case CompetitionType.GITHUB_GAME_OFF:
        return '🎮';
      case CompetitionType.GITLAB_HACKATHON:
        return '🦊';
      case CompetitionType.OPEN_SOURCE_CHALLENGE:
        return '🌟';
      default:
        return '🏆';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return theme.palette.success.main;
    if (progress >= 50) return theme.palette.warning.main;
    if (progress >= 25) return theme.palette.info.main;
    return theme.palette.error.main;
  };

  const getMilestoneIcon = (milestone: Milestone) => {
    if (milestone.achievedAt) {
      return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
    }
    if (milestone.progress > 0) {
      return <ScheduleIcon sx={{ color: theme.palette.warning.main }} />;
    }
    return <UncompletedIcon sx={{ color: theme.palette.grey[500] }} />;
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setMilestoneDialogOpen(true);
  };

  const handleSyncProgress = async () => {
    try {
      await competitionApi.syncExternalProgress(participationId);
      await loadProgressData();
    } catch (err: any) {
      setError(err.message || 'Failed to sync progress');
    }
  };

  if (loading) {
    return (
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.2)'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Competition Progress
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.05) 0%, rgba(255, 100, 100, 0.05) 100%)',
        border: '1px solid rgba(255, 0, 0, 0.2)'
      }}>
        <CardContent>
          <Typography color="error" align="center" gutterBottom>
            {error}
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button onClick={loadProgressData} variant="outlined">
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!progressData || !participation || !competition || !stats) {
    return null;
  }

  return (
    <>
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        animation: animated ? `${glowPulse} 3s ease-in-out infinite` : 'none'
      }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ 
                backgroundColor: 'transparent',
                border: `2px solid ${theme.palette.primary.main}`,
                mr: 2
              }}>
                {getCompetitionTypeIcon(competition.type)}
              </Avatar>
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold',
                    animation: animated ? `${neonGlow} 2s ease-in-out infinite` : 'none'
                  }}
                >
                  {competition.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {participation.status.toUpperCase()} • {stats.timeRemaining}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Auto-refresh">
                <IconButton 
                  size="small"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  sx={{ color: autoRefresh ? theme.palette.success.main : theme.palette.grey[500] }}
                >
                  {autoRefresh ? <PlayArrowIcon /> : <PauseIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Sync external progress">
                <IconButton size="small" onClick={handleSyncProgress}>
                  <TrendingUpIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Overall Progress */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Overall Progress
              </Typography>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold',
                color: getProgressColor(stats.totalProgress)
              }}>
                {Math.round(stats.totalProgress)}%
              </Typography>
            </Box>
            
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={stats.totalProgress}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getProgressColor(stats.totalProgress),
                    borderRadius: 6,
                    animation: animated ? `${progressFill} 2s ease-out` : 'none',
                    boxShadow: `0 0 10px ${getProgressColor(stats.totalProgress)}40`
                  }
                }}
              />
              
              {/* Progress milestones markers */}
              {[25, 50, 75].map((milestone) => (
                <Box
                  key={milestone}
                  sx={{
                    position: 'absolute',
                    left: `${milestone}%`,
                    top: -2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: stats.totalProgress >= milestone 
                      ? theme.palette.success.main 
                      : 'rgba(255, 255, 255, 0.3)',
                    border: `2px solid ${theme.palette.background.paper}`,
                    transform: 'translateX(-50%)',
                    zIndex: 1
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Stats Grid */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(0, 255, 255, 0.05)',
                border: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  {stats.completedRequirements}/{stats.totalRequirements}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Requirements
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(255, 0, 255, 0.05)',
                border: '1px solid rgba(255, 0, 255, 0.2)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                  {stats.pointsEarned.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Points
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(255, 165, 0, 0.05)',
                border: '1px solid rgba(255, 165, 0, 0.2)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <FireIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                    {stats.currentStreak}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Streak
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(0, 255, 0, 0.05)',
                border: '1px solid rgba(0, 255, 0, 0.2)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                  {stats.milestonesAchieved}/{stats.totalMilestones}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Milestones
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Requirements Progress */}
          {showRequirements && !compact && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                📋 Requirements Progress
              </Typography>
              <Stack spacing={1}>
                {progressData.requirements.slice(0, compact ? 3 : 5).map((requirement) => (
                  <Box
                    key={requirement.requirementId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 1,
                      border: `1px solid ${requirement.completed 
                        ? theme.palette.success.main + '40' 
                        : 'rgba(255, 255, 255, 0.1)'}`
                    }}
                  >
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      mr: 2,
                      backgroundColor: requirement.completed 
                        ? theme.palette.success.main 
                        : 'rgba(255, 255, 255, 0.1)'
                    }}>
                      {requirement.completed ? <CheckCircleIcon /> : <UncompletedIcon />}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {requirement.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {requirement.description}
                      </Typography>
                      
                      {!requirement.completed && requirement.progress > 0 && (
                        <LinearProgress
                          variant="determinate"
                          value={requirement.progress}
                          sx={{
                            mt: 0.5,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: theme.palette.warning.main,
                              borderRadius: 2
                            }
                          }}
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        {requirement.score}/{requirement.maxScore}
                      </Typography>
                      {requirement.required && (
                        <Chip
                          label="Required"
                          size="small"
                          sx={{
                            ml: 1,
                            backgroundColor: theme.palette.error.main,
                            color: 'white',
                            fontSize: '0.6rem'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Milestones Timeline */}
          {showMilestones && !compact && progressData.milestones.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                🎯 Milestones
              </Typography>
              
              <Timeline position="right">
                {progressData.milestones.map((milestone, index) => (
                  <TimelineItem key={milestone.milestoneId}>
                    <TimelineSeparator>
                      <TimelineDot sx={{ 
                        backgroundColor: milestone.achievedAt 
                          ? theme.palette.success.main 
                          : milestone.progress > 0 
                            ? theme.palette.warning.main 
                            : theme.palette.grey[500],
                        cursor: 'pointer'
                      }}>
                        {getMilestoneIcon(milestone)}
                      </TimelineDot>
                      {index < progressData.milestones.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${milestone.achievedAt 
                            ? theme.palette.success.main + '40' 
                            : 'rgba(255, 255, 255, 0.1)'}`,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            transform: 'translateX(4px)',
                            transition: 'all 0.2s ease'
                          }
                        }}
                        onClick={() => handleMilestoneClick(milestone)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {milestone.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {milestone.achievedAt && (
                              <Chip
                                icon={<VerifiedIcon />}
                                label="Achieved"
                                size="small"
                                sx={{
                                  backgroundColor: theme.palette.success.main,
                                  color: 'white',
                                  fontSize: '0.7rem'
                                }}
                              />
                            )}
                            <Chip
                              label={`${milestone.points} pts`}
                              size="small"
                              sx={{
                                backgroundColor: theme.palette.info.main,
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {milestone.description}
                        </Typography>
                        
                        {!milestone.achievedAt && (
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Progress: {milestone.currentValue}/{milestone.targetValue}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                {Math.round(milestone.progress)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={milestone.progress}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: theme.palette.primary.main,
                                  borderRadius: 3
                                }
                              }}
                            />
                          </Box>
                        )}
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Milestone Detail Dialog */}
      <Dialog
        open={milestoneDialogOpen}
        onClose={() => setMilestoneDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedMilestone && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ backgroundColor: theme.palette.primary.main }}>
                  <FlagIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedMilestone.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${selectedMilestone.points} points`}
                      size="small"
                      sx={{ backgroundColor: theme.palette.info.main, color: 'white' }}
                    />
                    {selectedMilestone.achievedAt && (
                      <Chip
                        icon={<VerifiedIcon />}
                        label="Achieved"
                        size="small"
                        sx={{ backgroundColor: theme.palette.success.main, color: 'white' }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>
                {selectedMilestone.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Progress Details:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current: {selectedMilestone.currentValue} / {selectedMilestone.targetValue}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion: {Math.round(selectedMilestone.progress)}%
                </Typography>
              </Box>

              {selectedMilestone.achievedAt && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                    Achievement Date:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(parseISO(selectedMilestone.achievedAt), 'EEEE, MMMM do, yyyy \'at\' h:mm a')}
                  </Typography>
                </Box>
              )}

              <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Criteria: {selectedMilestone.criteria}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMilestoneDialogOpen(false)}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<LaunchIcon />}
                onClick={() => {
                  window.open(`/competitions/${competition.id}`, '_blank');
                  setMilestoneDialogOpen(false);
                }}
              >
                View Competition
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default CompetitionProgressWidget;