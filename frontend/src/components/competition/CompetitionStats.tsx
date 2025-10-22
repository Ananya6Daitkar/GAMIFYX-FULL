import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Leaderboard as LeaderboardIcon,
  LocalFireDepartment as FireIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { CompetitionUserStats } from '../../types/competition';

interface CompetitionStatsProps {
  stats: CompetitionUserStats;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  progress,
  trend
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUpIcon fontSize="small" sx={{ color: theme.palette.success.main }} />;
    if (trend === 'down') return <TrendingUpIcon fontSize="small" sx={{ color: theme.palette.error.main, transform: 'rotate(180deg)' }} />;
    return null;
  };

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${color}40`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 32px ${color}30`,
          border: `1px solid ${color}60`,
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color, fontSize: '2rem' }}>
            {icon}
          </Box>
          {getTrendIcon()}
        </Box>

        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}

        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 3,
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(progress)}% to next milestone
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const CompetitionStats: React.FC<CompetitionStatsProps> = ({ stats }) => {
  const theme = useTheme();

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return theme.palette.error.main;
    if (streak >= 14) return theme.palette.warning.main;
    if (streak >= 7) return theme.palette.info.main;
    return theme.palette.success.main;
  };

  const getRankTier = (rank: number) => {
    if (rank <= 10) return { tier: 'Elite', color: theme.palette.warning.main };
    if (rank <= 50) return { tier: 'Advanced', color: theme.palette.info.main };
    if (rank <= 100) return { tier: 'Intermediate', color: theme.palette.success.main };
    return { tier: 'Beginner', color: theme.palette.grey[500] };
  };

  const rankInfo = getRankTier(stats.bestRank || 999);

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        📊 Your Competition Stats
      </Typography>
      
      <Grid container spacing={3}>
        {/* Total Participations */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Participations"
            value={stats.totalParticipations}
            subtitle={`${stats.activeParticipations} active, ${stats.completedParticipations} completed`}
            icon={<TrophyIcon />}
            color={theme.palette.primary.main}
            trend={stats.activeParticipations > 0 ? 'up' : 'neutral'}
          />
        </Grid>

        {/* Total Points */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Points"
            value={stats.totalPoints.toLocaleString()}
            subtitle={`Avg: ${Math.round(stats.averageScore)} per competition`}
            icon={<StarIcon />}
            color={theme.palette.secondary.main}
            progress={((stats.totalPoints % 1000) / 1000) * 100}
            trend="up"
          />
        </Grid>

        {/* Current Streak */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Current Streak"
            value={`${stats.currentStreak} days`}
            subtitle={`Best: ${stats.longestStreak} days`}
            icon={<FireIcon />}
            color={getStreakColor(stats.currentStreak)}
            progress={(stats.currentStreak / Math.max(stats.longestStreak, 30)) * 100}
            trend={stats.currentStreak > 0 ? 'up' : 'neutral'}
          />
        </Grid>

        {/* Best Rank */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Best Rank"
            value={stats.bestRank ? `#${stats.bestRank}` : 'N/A'}
            subtitle={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={rankInfo.tier}
                  size="small"
                  sx={{
                    backgroundColor: rankInfo.color,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
            }
            icon={<LeaderboardIcon />}
            color={rankInfo.color}
            trend={stats.bestRank && stats.bestRank <= 50 ? 'up' : 'neutral'}
          />
        </Grid>

        {/* Achievements Summary */}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.success.main}20 0%, ${theme.palette.success.main}10 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.success.main}40`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ color: theme.palette.success.main, fontSize: '2rem' }}>
                  🏆
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Achievements
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total earned: {stats.totalAchievements}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${stats.totalBadges} Badges`}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.warning.main,
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
                <Chip
                  label={`${stats.totalAchievements} Total`}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.success.main,
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Summary */}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.info.main}20 0%, ${theme.palette.info.main}10 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.info.main}40`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ color: theme.palette.info.main, fontSize: '2rem' }}>
                  📈
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Performance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average score: {Math.round(stats.averageScore)}
                  </Typography>
                </Box>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={(stats.averageScore / 100) * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.info.main,
                    borderRadius: 4,
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Consistency across competitions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Summary */}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.warning.main}20 0%, ${theme.palette.warning.main}10 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.warning.main}40`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ color: theme.palette.warning.main, fontSize: '2rem' }}>
                  ⚡
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Activity Level
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.activeParticipations > 0 ? 'Active' : 'Inactive'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${stats.activeParticipations} Active`}
                  size="small"
                  sx={{
                    backgroundColor: stats.activeParticipations > 0 ? theme.palette.success.main : theme.palette.grey[500],
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
                <Chip
                  label={`${stats.currentStreak}d Streak`}
                  size="small"
                  sx={{
                    backgroundColor: getStreakColor(stats.currentStreak),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CompetitionStats;