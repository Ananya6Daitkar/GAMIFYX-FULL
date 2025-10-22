/**
 * Leaderboard Widget Component - Shows current leaderboard with real-time updates
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tooltip,
  Fade
} from '@mui/material';
import {
  EmojiEvents,
  Refresh,
  TrendingUp,
  TrendingDown,
  Remove,
  Star
} from '@mui/icons-material';
import { LeaderboardEntry } from '../../types';
import { webSocketService } from '../../services/websocket';

interface LeaderboardWidgetProps {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
  onRefresh: () => void;
}

const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  leaderboard,
  currentUserId,
  onRefresh
}) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleRankChange = (event: any) => {
      if (event.type === 'rank_changed') {
        // Highlight the user whose rank changed
        setRecentlyUpdated(prev => new Set(prev).add(event.userId));
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setRecentlyUpdated(prev => {
            const newSet = new Set(prev);
            newSet.delete(event.userId);
            return newSet;
          });
        }, 3000);
        
        // Refresh leaderboard data
        onRefresh();
      }
    };

    webSocketService.on('game_event', handleRankChange);
    
    return () => {
      webSocketService.off('game_event', handleRankChange);
    };
  }, [onRefresh]);

  const handleTimeframeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeframe: 'daily' | 'weekly' | 'monthly' | 'all_time' | null
  ) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
      // In a real app, this would trigger a new API call
      onRefresh();
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <EmojiEvents sx={{ color: '#FFD700' }} />;
      case 2:
        return <EmojiEvents sx={{ color: '#C0C0C0' }} />;
      case 3:
        return <EmojiEvents sx={{ color: '#CD7F32' }} />;
      default:
        return <Typography variant="h6" color="text.secondary">#{rank}</Typography>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return 'transparent';
    }
  };

  const getTrendIcon = (_rank: number) => {
    // Mock trend data - in real app this would come from API
    const trend = Math.random();
    if (trend > 0.6) return <TrendingUp color="success" fontSize="small" />;
    if (trend < 0.4) return <TrendingDown color="error" fontSize="small" />;
    return <Remove color="disabled" fontSize="small" />;
  };

  const currentUserEntry = leaderboard.find(entry => entry.userId === currentUserId);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Leaderboard
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <ToggleButtonGroup
              value={timeframe}
              exclusive
              onChange={handleTimeframeChange}
              size="small"
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="all_time">All Time</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={onRefresh} size="small">
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Current User Position (if not in top 10) */}
        {currentUserEntry && currentUserEntry.rank > 10 && (
          <Box mb={2}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Your Position
            </Typography>
            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Typography variant="body2">#{currentUserEntry.rank}</Typography>
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">You</Typography>
                      <Star color="primary" fontSize="small" />
                    </Box>
                  }
                  secondary={
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip size="small" label={`${currentUserEntry.totalPoints} pts`} />
                      <Chip size="small" label={`Level ${currentUserEntry.level}`} />
                      <Chip size="small" label={`${currentUserEntry.badges} badges`} />
                    </Box>
                  }
                />
                <Box textAlign="right">
                  {getTrendIcon(currentUserEntry.rank)}
                </Box>
              </ListItem>
            </Card>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* Top 10 Leaderboard */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Top Performers
        </Typography>
        
        <List disablePadding>
          {leaderboard.slice(0, 10).map((entry, _index) => {
            const isCurrentUser = entry.userId === currentUserId;
            
            return (
              <Fade in={true} timeout={500} key={entry.userId}>
                <ListItem
                  sx={{
                    bgcolor: isCurrentUser ? 'primary.50' : recentlyUpdated.has(entry.userId) ? 'success.50' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                    border: isCurrentUser ? '1px solid' : recentlyUpdated.has(entry.userId) ? '1px solid' : 'none',
                    borderColor: isCurrentUser ? 'primary.main' : recentlyUpdated.has(entry.userId) ? 'success.main' : 'transparent',
                    transition: 'all 0.3s ease'
                  }}
                >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: getRankColor(entry.rank),
                      color: entry.rank <= 3 ? 'black' : 'white',
                      border: entry.rank <= 3 ? '2px solid #fff' : 'none'
                    }}
                  >
                    {entry.rank <= 3 ? getRankIcon(entry.rank) : `#${entry.rank}`}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography 
                        variant="subtitle1" 
                        fontWeight={isCurrentUser ? 'bold' : 'normal'}
                      >
                        {isCurrentUser ? 'You' : entry.username}
                      </Typography>
                      {isCurrentUser && <Star color="primary" fontSize="small" />}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip 
                        size="small" 
                        label={`${entry.totalPoints.toLocaleString()} pts`}
                        color={entry.rank === 1 ? 'primary' : 'default'}
                      />
                      <Chip size="small" label={`Level ${entry.level}`} />
                      <Tooltip title={`${entry.badges} badges, ${entry.achievements} achievements`}>
                        <Chip size="small" label={`${entry.badges}🏆`} />
                      </Tooltip>
                      {entry.streak > 0 && (
                        <Chip 
                          size="small" 
                          label={`${entry.streak}🔥`}
                          color={entry.streak >= 7 ? 'success' : 'default'}
                        />
                      )}
                    </Box>
                  }
                />
                
                <Box textAlign="right">
                  {getTrendIcon(entry.rank)}
                </Box>
                </ListItem>
              </Fade>
            );
          })}
        </List>

        {leaderboard.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No leaderboard data available
            </Typography>
          </Box>
        )}

        {/* Summary Stats */}
        {leaderboard.length > 0 && (
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <Typography variant="caption" color="text.secondary">
              Showing top {Math.min(10, leaderboard.length)} of {leaderboard.length} students
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardWidget;