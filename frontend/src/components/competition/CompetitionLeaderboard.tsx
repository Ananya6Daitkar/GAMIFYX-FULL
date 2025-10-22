import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  LinearProgress,
  Grid,
  Divider
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  LocalFireDepartment as FireIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { CompetitionLeaderboardEntry } from '../../types/competition';

interface CompetitionLeaderboardProps {
  leaderboard: CompetitionLeaderboardEntry[];
}

const CompetitionLeaderboard: React.FC<CompetitionLeaderboardProps> = ({ leaderboard }) => {
  const theme = useTheme();

  const getRankColor = (rank: number) => {
    if (rank === 1) return theme.palette.warning.main; // Gold
    if (rank === 2) return theme.palette.grey[400]; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return theme.palette.primary.main;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return theme.palette.error.main;
    if (streak >= 14) return theme.palette.warning.main;
    if (streak >= 7) return theme.palette.info.main;
    return theme.palette.success.main;
  };

  if (leaderboard.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No leaderboard data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Participate in competitions to see rankings
        </Typography>
      </Box>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <Box>
      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <Card sx={{ 
          mb: 4, 
          background: `linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.palette.warning.main}40`
        }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
              🏆 Top Performers
            </Typography>
            
            <Grid container spacing={3} justifyContent="center">
              {topThree.map((entry, index) => (
                <Grid item xs={12} sm={4} key={entry.userId}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 3,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${getRankColor(entry.rank)}20 0%, ${getRankColor(entry.rank)}10 100%)`,
                      border: `2px solid ${getRankColor(entry.rank)}40`,
                      position: 'relative',
                      transform: entry.rank === 1 ? 'scale(1.05)' : 'none',
                      zIndex: entry.rank === 1 ? 2 : 1,
                    }}
                  >
                    {/* Rank Badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -15,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: getRankColor(entry.rank),
                        color: 'white',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        border: '3px solid white',
                        boxShadow: theme.shadows[4]
                      }}
                    >
                      {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
                    </Box>

                    {/* Avatar */}
                    <Avatar
                      src={entry.avatarUrl}
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        mt: 2,
                        border: `3px solid ${getRankColor(entry.rank)}`,
                        fontSize: '2rem'
                      }}
                    >
                      {entry.displayName.charAt(0).toUpperCase()}
                    </Avatar>

                    {/* Name */}
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {entry.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      @{entry.username}
                    </Typography>

                    {/* Score */}
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: getRankColor(entry.rank), mb: 2 }}>
                      {entry.totalScore.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      points
                    </Typography>

                    {/* Stats */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {entry.participations}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Competitions
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {entry.achievements}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Achievements
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {entry.badges}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Badges
                        </Typography>
                      </Box>
                    </Box>

                    {/* Streak */}
                    {entry.currentStreak > 0 && (
                      <Chip
                        icon={<FireIcon />}
                        label={`${entry.currentStreak} day streak`}
                        size="small"
                        sx={{
                          mt: 2,
                          backgroundColor: getStreakColor(entry.currentStreak),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Rest of Leaderboard */}
      {others.length > 0 && (
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          backdropFilter: 'blur(10px)' 
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              📊 Full Leaderboard
            </Typography>
            
            <List>
              {others.map((entry, index) => (
                <React.Fragment key={entry.userId}>
                  <ListItem
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      background: 'rgba(255, 255, 255, 0.02)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        transform: 'translateX(4px)',
                        transition: 'all 0.2s ease'
                      }
                    }}
                  >
                    {/* Rank */}
                    <Box
                      sx={{
                        minWidth: 60,
                        textAlign: 'center',
                        mr: 2
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: getRankColor(entry.rank),
                          fontSize: '1.2rem'
                        }}
                      >
                        #{entry.rank}
                      </Typography>
                    </Box>

                    {/* Avatar */}
                    <ListItemAvatar>
                      <Avatar
                        src={entry.avatarUrl}
                        sx={{
                          width: 50,
                          height: 50,
                          border: `2px solid ${theme.palette.primary.main}40`
                        }}
                      >
                        {entry.displayName.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>

                    {/* User Info */}
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {entry.displayName}
                          </Typography>
                          {entry.currentStreak > 0 && (
                            <Chip
                              icon={<FireIcon />}
                              label={`${entry.currentStreak}d`}
                              size="small"
                              sx={{
                                backgroundColor: getStreakColor(entry.currentStreak),
                                color: 'white',
                                height: 20,
                                fontSize: '0.7rem'
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            @{entry.username}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {entry.participations} competitions
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entry.achievements} achievements
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entry.badges} badges
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />

                    {/* Score */}
                    <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: theme.palette.primary.main
                        }}
                      >
                        {entry.totalScore.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        points
                      </Typography>
                    </Box>
                  </ListItem>
                  
                  {index < others.length - 1 && (
                    <Divider sx={{ my: 1, opacity: 0.3 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Stats */}
      <Card sx={{ 
        mt: 3,
        background: `linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)`,
        backdropFilter: 'blur(10px)'
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            📈 Leaderboard Insights
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  {leaderboard.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Participants
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                  {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.totalScore, 0) / leaderboard.length).toLocaleString() : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Score
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                  {leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.currentStreak)) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Longest Streak
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                  {leaderboard.length > 0 ? leaderboard.reduce((sum, entry) => sum + entry.achievements, 0) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Achievements
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompetitionLeaderboard;