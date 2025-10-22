import React from 'react';
import { Box, Typography, Avatar, Chip, Badge } from '@mui/material';
import { EmojiEvents, Star, Bolt } from '@mui/icons-material';

interface LeaderboardItemProps {
  rank: number;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  badges?: Array<{ id: string; name: string; icon: string; color: string }>;
  streak?: number;
  status?: 'online' | 'away' | 'offline';
  isCurrentUser?: boolean;
  onClick?: () => void;
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  rank,
  name,
  avatar,
  xp,
  level,
  badges = [],
  streak = 0,
  status = 'offline',
  isCurrentUser = false,
  onClick
}) => {
  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <EmojiEvents sx={{ color: '#FFD700', fontSize: 24 }} />;
      case 2:
        return <EmojiEvents sx={{ color: '#C0C0C0', fontSize: 24 }} />;
      case 3:
        return <EmojiEvents sx={{ color: '#CD7F32', fontSize: 24 }} />;
      default:
        return (
          <Typography variant="h6" sx={{ color: 'var(--color-text-secondary)' }}>
            #{rank}
          </Typography>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'var(--color-success)';
      case 'away':
        return 'var(--color-warning)';
      case 'offline':
        return 'var(--color-text-secondary)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  return (
    <Box
      className="leaderboard-item"
      sx={{
        border: isCurrentUser ? '2px solid var(--color-primary)' : undefined,
        background: isCurrentUser ? 'var(--color-surface-glow)' : undefined,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      {/* Rank */}
      <Box className="leaderboard-rank">
        {getRankIcon()}
      </Box>

      {/* Avatar with Status */}
      <Box className="leaderboard-avatar">
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor(),
                border: '2px solid var(--color-background)',
                boxShadow: `0 0 8px ${getStatusColor()}80`
              }}
            />
          }
        >
          <Avatar
            src={avatar}
            sx={{
              width: 56,
              height: 56,
              border: '2px solid var(--color-primary)',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
            }}
          >
            {name.charAt(0)}
          </Avatar>
        </Badge>
      </Box>

      {/* Member Info */}
      <Box className="leaderboard-info">
        <Box className="leaderboard-name">
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {isCurrentUser ? 'You' : name}
            {isCurrentUser && <Star sx={{ color: 'var(--color-primary)', fontSize: 20 }} />}
          </Typography>
        </Box>

        <Box className="leaderboard-stats">
          <Chip
            label={`${xp.toLocaleString()} XP`}
            size="small"
            sx={{
              background: 'var(--color-surface-glass)',
              color: 'var(--color-text-primary)',
              border: '1px solid rgba(0, 255, 255, 0.2)'
            }}
          />
          <Chip
            label={`LVL ${level}`}
            size="small"
            sx={{
              background: 'var(--gradient-button)',
              color: 'var(--color-background)',
              fontWeight: 'var(--font-weight-semibold)'
            }}
          />
          {badges.slice(0, 2).map((badge) => (
            <Chip
              key={badge.id}
              label={badge.icon}
              size="small"
              sx={{
                minWidth: 'auto',
                height: 24,
                backgroundColor: `${badge.color}20`,
                border: `1px solid ${badge.color}60`,
                '& .MuiChip-label': {
                  px: 0.5
                }
              }}
            />
          ))}
          {badges.length > 2 && (
            <Chip
              label={`+${badges.length - 2}`}
              size="small"
              sx={{
                minWidth: 'auto',
                height: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-text-secondary)'
              }}
            />
          )}
        </Box>
      </Box>

      {/* Streak */}
      {streak > 0 && (
        <Box className="leaderboard-score">
          <Box display="flex" alignItems="center" justifyContent="center" mb={0.5}>
            <Bolt sx={{ color: 'var(--color-warning)', fontSize: 16, mr: 0.5 }} />
            <Typography
              variant="body2"
              sx={{
                color: 'var(--color-warning)',
                fontWeight: 'var(--font-weight-semibold)'
              }}
            >
              {streak}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: 'var(--color-text-secondary)' }}
          >
            STREAK
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LeaderboardItem;