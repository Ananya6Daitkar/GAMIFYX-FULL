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
  Fade,
  Zoom,
  Collapse
} from '@mui/material';
import {
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncompletedIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocalFireDepartment as FireIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  Milestone,
  ProgressTrackingData,
  Participation,
  Competition
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

// Cyberpunk animations
const milestoneGlow = keyframes`
  0% { 
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.6);
    transform: scale(1.02);
  }
  100% { 
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
    transform: scale(1);
  }
`;

const progressPulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const achievementCelebration = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.2) rotate(5deg); }
  50% { transform: scale(1.1) rotate(-5deg); }
  75% { transform: scale(1.2) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

interface MilestoneTrackerProps {
  participationId: string;
  showCompact?: boolean;
  maxMilestones?: number;
  autoRefresh?: boolean;
  onMilestoneAchieved?: (milestone: Milestone) => void;
}

interface MilestoneWithProgress extends Milestone {
  isNew?: boolean;
  progressChange?: number;
  estimatedCompletion?: string;
}

const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  participationId,
  showCompact = false,
  maxMilestones = 5,
  autoRefresh = true,
  onMilestoneAchieved
}) => {
  const theme = useTheme();
  const [milestones, setMilestones] = useState<MilestoneWithProgress[]>([]);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!showCompact);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [newAchievements, setNewAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMilestoneData();
    
    // Set up auto-refresh
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadMilestoneData, 15000); // Refresh every 15 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [participationId, autoRefresh]);

  const loadMilestoneData = async () => {
    try {
      setError(null);
      
      const [progressResponse, participationResponse] = await Promise.all([
        competitionApi.getProgressTracking(participationId),
        competitionApi.getParticipation(participationId)
      ]);

      setParticipation(participationResponse);

      // Load competition details if not already loaded
      if (!competition) {
        const competitionResponse = await competitionApi.getCompetition(participationResponse.competitionId);
        setCompetition(competitionResponse);
      }

      // Process milestones with progress tracking
      const processedMilestones = processMilestones(progressResponse.milestones);
      
      // Check for new achievements
      const previousMilestones = milestones;
      const newlyAchieved = processedMilestones.filter(milestone => 
        milestone.achievedAt && 
        !previousMilestones.find(prev => prev.milestoneId === milestone.milestoneId && prev.achievedAt)
      );

      // Trigger celebration for new achievements
      if (newlyAchieved.length > 0) {
        const newAchievementIds = new Set(newlyAchieved.map(m => m.milestoneId));
        setNewAchievements(newAchievementIds);
        
        // Clear celebration after animation
        setTimeout(() => setNewAchievements(new Set()), 3000);
        
        // Notify parent component
        newlyAchieved.forEach(milestone => {
          onMilestoneAchieved?.(milestone);
        });
      }

      setMilestones(processedMilestones);
      setLastUpdate(new Date());

    } catch (err: any) {
      setError(err.message || 'Failed to load milestone data');
    } finally {
      setLoading(false);
    }
  };

  const processMilestones = (rawMilestones: Milestone[]): MilestoneWithProgress[] => {
    return rawMilestones.map(milestone => {
      // Calculate estimated completion time based on current progress rate
      let estimatedCompletion: string | undefined;
      
      if (!milestone.achievedAt && milestone.progress > 0 && milestone.progress < 100) {
        const remaining = milestone.targetValue - milestone.currentValue;
        const progressRate = milestone.currentValue / milestone.targetValue;
        
        if (progressRate > 0) {
          // Simple estimation based on current progress
          const estimatedDays = Math.ceil(remaining / (milestone.currentValue / 7)); // Assume current progress over 7 days
          estimatedCompletion = estimatedDays <= 30 ? `~${estimatedDays} days` : 'More than a month';
        }
      }

      return {
        ...milestone,
        estimatedCompletion
      };
    }).sort((a, b) => {
      // Sort by: achieved first, then by progress, then by points
      if (a.achievedAt && !b.achievedAt) return -1;
      if (!a.achievedAt && b.achievedAt) return 1;
      if (a.achievedAt && b.achievedAt) return 0;
      
      if (a.progress !== b.progress) return b.progress - a.progress;
      return b.points - a.points;
    });
  };

  const getMilestoneIcon = (milestone: MilestoneWithProgress) => {
    if (milestone.achievedAt) {
      return (
        <CheckCircleIcon 
          sx={{ 
            color: theme.palette.success.main,
            animation: newAchievements.has(milestone.milestoneId) 
              ? `${achievementCelebration} 1s ease-in-out` 
              : 'none'
          }} 
        />
      );
    }
    if (milestone.progress > 0) {
      return <ScheduleIcon sx={{ color: theme.palette.warning.main }} />;
    }
    return <UncompletedIcon sx={{ color: theme.palette.grey[500] }} />;
  };

  const getMilestoneColor = (milestone: MilestoneWithProgress) => {
    if (milestone.achievedAt) return theme.palette.success.main;
    if (milestone.progress >= 75) return theme.palette.warning.main;
    if (milestone.progress >= 25) return theme.palette.info.main;
    return theme.palette.grey[500];
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return theme.palette.success.main;
    if (progress >= 70) return theme.palette.warning.main;
    if (progress >= 40) return theme.palette.info.main;
    return theme.palette.primary.main;
  };

  if (loading && milestones.length === 0) {
    return (
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.05) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.2)'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FlagIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🎯 Milestones
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
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
            <IconButton onClick={loadMilestoneData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.05) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.2)'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FlagIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🎯 Milestones
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            No milestones available for this competition
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const displayedMilestones = expanded ? milestones : milestones.slice(0, maxMilestones);
  const achievedCount = milestones.filter(m => m.achievedAt).length;
  const inProgressCount = milestones.filter(m => !m.achievedAt && m.progress > 0).length;

  return (
    <Card sx={{ 
      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.05) 100%)',
      border: '1px solid rgba(255, 215, 0, 0.2)',
      backdropFilter: 'blur(10px)',
      animation: newAchievements.size > 0 ? `${milestoneGlow} 2s ease-in-out` : 'none'
    }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FlagIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🎯 Milestones
            </Typography>
            <Chip
              label={`${achievedCount}/${milestones.length}`}
              size="small"
              sx={{
                ml: 1,
                backgroundColor: theme.palette.success.main,
                color: 'white',
                fontSize: '0.7rem'
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </Typography>
            <IconButton size="small" onClick={loadMilestoneData}>
              <RefreshIcon />
            </IconButton>
            {!showCompact && milestones.length > maxMilestones && (
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Summary Stats */}
        {!showCompact && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                  {achievedCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Achieved
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={4}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.3)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                  {inProgressCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  In Progress
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={4}>
              <Paper sx={{ 
                p: 1.5, 
                textAlign: 'center',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                  {milestones.reduce((sum, m) => sum + m.points, 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Points
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Milestones List */}
        <Stack spacing={showCompact ? 1 : 2}>
          {displayedMilestones.map((milestone) => (
            <Fade key={milestone.milestoneId} in timeout={500}>
              <Paper
                sx={{
                  p: showCompact ? 1.5 : 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${getMilestoneColor(milestone)}40`,
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': milestone.achievedAt ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.warning.main})`,
                    animation: newAchievements.has(milestone.milestoneId) 
                      ? `${progressPulse} 1s ease-in-out infinite` 
                      : 'none'
                  } : {}
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {/* Milestone Icon */}
                  <Avatar sx={{ 
                    width: showCompact ? 32 : 40, 
                    height: showCompact ? 32 : 40,
                    backgroundColor: getMilestoneColor(milestone) + '20',
                    border: `2px solid ${getMilestoneColor(milestone)}`
                  }}>
                    {getMilestoneIcon(milestone)}
                  </Avatar>
                  
                  {/* Milestone Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography 
                        variant={showCompact ? "body2" : "subtitle2"} 
                        sx={{ fontWeight: 'bold', flex: 1 }}
                      >
                        {milestone.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                        {milestone.achievedAt && (
                          <Zoom in timeout={500}>
                            <Chip
                              icon={<TrophyIcon />}
                              label="Achieved"
                              size="small"
                              sx={{
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                fontSize: '0.7rem',
                                animation: newAchievements.has(milestone.milestoneId) 
                                  ? `${achievementCelebration} 2s ease-in-out` 
                                  : 'none'
                              }}
                            />
                          </Zoom>
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
                    
                    {!showCompact && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {milestone.description}
                      </Typography>
                    )}
                    
                    {/* Progress Bar */}
                    {!milestone.achievedAt && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progress: {milestone.currentValue}/{milestone.targetValue}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {Math.round(milestone.progress)}%
                            </Typography>
                            {milestone.estimatedCompletion && (
                              <Tooltip title="Estimated completion time">
                                <Chip
                                  label={milestone.estimatedCompletion}
                                  size="small"
                                  sx={{
                                    backgroundColor: theme.palette.grey[700],
                                    color: 'white',
                                    fontSize: '0.6rem',
                                    height: 16
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        
                        <LinearProgress
                          variant="determinate"
                          value={milestone.progress}
                          sx={{
                            height: showCompact ? 6 : 8,
                            borderRadius: showCompact ? 3 : 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getProgressColor(milestone.progress),
                              borderRadius: showCompact ? 3 : 4,
                              animation: milestone.progress > 0 ? `${progressPulse} 2s ease-in-out infinite` : 'none'
                            }
                          }}
                        />
                      </Box>
                    )}
                    
                    {/* Achievement Date */}
                    {milestone.achievedAt && !showCompact && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Achieved {format(parseISO(milestone.achievedAt), 'MMM dd, yyyy')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Fade>
          ))}
        </Stack>

        {/* Show More/Less */}
        {!showCompact && milestones.length > maxMilestones && (
          <Collapse in={!expanded}>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {milestones.length - maxMilestones} more milestones available
              </Typography>
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};

export default MilestoneTracker;