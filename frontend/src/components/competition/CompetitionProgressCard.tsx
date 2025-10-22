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
  IconButton,
  Tooltip,
  Stack,
  Badge
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  LocalFireDepartment as FireIcon,
  TrendingUp as TrendingUpIcon,
  Launch as LaunchIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { differenceInDays, parseISO } from 'date-fns';
import {
  Participation,
  Competition,
  CompetitionType,
  ParticipationStatus
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

// Cyberpunk animations
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.6), 0 0 20px rgba(255, 0, 255, 0.2); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
`;

const progressShimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

interface CompetitionProgressCardProps {
  participationId: string;
  onClick?: () => void;
  showDetails?: boolean;
  animated?: boolean;
}

interface CompactStats {
  progress: number;
  completedRequirements: number;
  totalRequirements: number;
  pointsEarned: number;
  currentStreak: number;
  daysRemaining: number;
  status: ParticipationStatus;
}

const CompetitionProgressCard: React.FC<CompetitionProgressCardProps> = ({
  participationId,
  onClick,
  showDetails = true,
  animated = true
}) => {
  const theme = useTheme();
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stats, setStats] = useState<CompactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompactData();
  }, [participationId]);

  const loadCompactData = async () => {
    try {
      setLoading(true);
      setError(null);

      const participationResponse = await competitionApi.getParticipation(participationId);
      setParticipation(participationResponse);

      const competitionResponse = await competitionApi.getCompetition(participationResponse.competitionId);
      setCompetition(competitionResponse);

      // Calculate compact statistics
      const stats = calculateCompactStats(participationResponse, competitionResponse);
      setStats(stats);

    } catch (err: any) {
      setError(err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompactStats = (
    participation: Participation,
    competition: Competition
  ): CompactStats => {
    const progress = participation.progress.completionPercentage;
    const completedRequirements = participation.progress.completedRequirements.length;
    const totalRequirements = participation.progress.totalRequirements;
    const pointsEarned = participation.totalScore;
    const currentStreak = participation.progress.currentStreak;
    
    const endDate = parseISO(competition.endDate);
    const daysRemaining = Math.max(0, differenceInDays(endDate, new Date()));
    
    return {
      progress,
      completedRequirements,
      totalRequirements,
      pointsEarned,
      currentStreak,
      daysRemaining,
      status: participation.status
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

  const getStatusColor = (status: ParticipationStatus) => {
    switch (status) {
      case ParticipationStatus.ACTIVE:
        return theme.palette.success.main;
      case ParticipationStatus.COMPLETED:
        return theme.palette.info.main;
      case ParticipationStatus.REGISTERED:
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Card sx={{ 
        minHeight: 120,
        background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.2)'
      }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <CircularProgress size={40} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ 
        minHeight: 120,
        background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.05) 0%, rgba(255, 100, 100, 0.05) 100%)',
        border: '1px solid rgba(255, 0, 0, 0.2)'
      }}>
        <CardContent>
          <Typography color="error" variant="body2" align="center">
            Failed to load
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!participation || !competition || !stats) {
    return null;
  }

  return (
    <Card sx={{ 
      cursor: onClick ? 'pointer' : 'default',
      background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)',
      border: '1px solid rgba(0, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      animation: animated ? `${pulseGlow} 4s ease-in-out infinite` : 'none',
      transition: 'all 0.3s ease',
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0, 255, 255, 0.3)',
        border: '1px solid rgba(0, 255, 255, 0.4)'
      } : {}
    }}
    onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Avatar sx={{ 
              width: 32, 
              height: 32, 
              mr: 1.5,
              backgroundColor: 'transparent',
              border: `2px solid ${getStatusColor(stats.status)}`,
              fontSize: '1rem'
            }}>
              {getCompetitionTypeIcon(competition.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {competition.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={stats.status.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getStatusColor(stats.status),
                    color: 'white',
                    fontSize: '0.6rem',
                    height: 16
                  }}
                />
                {stats.daysRemaining > 0 && (
                  <Chip
                    icon={<ScheduleIcon sx={{ fontSize: 12 }} />}
                    label={`${stats.daysRemaining}d`}
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.info.main,
                      color: 'white',
                      fontSize: '0.6rem',
                      height: 16
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
          
          {showDetails && (
            <IconButton size="small" sx={{ color: theme.palette.primary.main }}>
              <LaunchIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold',
              color: getProgressColor(stats.progress)
            }}>
              {Math.round(stats.progress)}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={stats.progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getProgressColor(stats.progress),
                borderRadius: 4,
                background: animated ? `linear-gradient(
                  90deg,
                  ${getProgressColor(stats.progress)} 0%,
                  ${getProgressColor(stats.progress)}80 50%,
                  ${getProgressColor(stats.progress)} 100%
                )` : getProgressColor(stats.progress),
                backgroundSize: animated ? '200px 100%' : 'auto',
                animation: animated ? `${progressShimmer} 2s infinite linear` : 'none'
              }
            }}
          />
        </Box>

        {/* Stats */}
        {showDetails && (
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold', 
                fontSize: '0.9rem',
                color: theme.palette.primary.main 
              }}>
                {stats.completedRequirements}/{stats.totalRequirements}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Tasks
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold', 
                fontSize: '0.9rem',
                color: theme.palette.secondary.main 
              }}>
                {stats.pointsEarned.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Points
              </Typography>
            </Box>
            
            {stats.currentStreak > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                  <FireIcon sx={{ color: theme.palette.error.main, fontSize: 16 }} />
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem',
                    color: theme.palette.error.main 
                  }}>
                    {stats.currentStreak}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Streak
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* Achievement Indicator */}
        {stats.progress === 100 && (
          <Box sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            animation: animated ? 'pulse 2s infinite' : 'none'
          }}>
            <Badge
              badgeContent={<CheckCircleIcon sx={{ fontSize: 12 }} />}
              color="success"
            >
              <StarIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
            </Badge>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CompetitionProgressCard;