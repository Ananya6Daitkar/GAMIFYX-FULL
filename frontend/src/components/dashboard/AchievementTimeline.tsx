/**
 * Achievement Timeline Component - Shows achievements in chronological order
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  Paper
} from '@mui/material';
// Timeline components replaced with simple list implementation
import {
  EmojiEvents,
  Assignment,
  TrendingUp,
  // Favorite,
  Group,
  Star
} from '@mui/icons-material';
import { Achievement, AchievementCategory } from '../../types';

interface AchievementTimelineProps {
  achievements: Achievement[];
}

const AchievementTimeline: React.FC<AchievementTimelineProps> = ({ achievements }) => {

  const getCategoryIcon = (category: AchievementCategory) => {
    switch (category) {
      case AchievementCategory.SUBMISSION:
        return <Assignment />;
      case AchievementCategory.QUALITY:
        return <Star />;
      case AchievementCategory.CONSISTENCY:
        return <TrendingUp />;
      case AchievementCategory.IMPROVEMENT:
        return <TrendingUp />;
      case AchievementCategory.SOCIAL:
        return <Group />;
      case AchievementCategory.MILESTONE:
        return <EmojiEvents />;
      default:
        return <EmojiEvents />;
    }
  };

  const getCategoryColor = (category: AchievementCategory) => {
    switch (category) {
      case AchievementCategory.SUBMISSION:
        return 'primary';
      case AchievementCategory.QUALITY:
        return 'warning';
      case AchievementCategory.CONSISTENCY:
        return 'success';
      case AchievementCategory.IMPROVEMENT:
        return 'info';
      case AchievementCategory.SOCIAL:
        return 'secondary';
      case AchievementCategory.MILESTONE:
        return 'error';
      default:
        return 'primary';
    }
  };

  // Sort achievements by earned date (most recent first)
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (!a.earnedAt || !b.earnedAt) return 0;
    return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Achievement Timeline ({achievements.length})
        </Typography>

        {sortedAchievements.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No achievements yet. Complete assignments and improve your skills to unlock achievements!
            </Typography>
          </Box>
        ) : (
          <Box>
            {sortedAchievements.map((achievement, _index) => (
              <Box key={achievement.id} mb={2}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: `4px solid ${getCategoryColor(achievement.category) === 'primary' ? '#1976d2' : '#ed6c02'}`
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: getCategoryColor(achievement.category) === 'primary' ? '#1976d2' : '#ed6c02'
                        }}
                      >
                        {getCategoryIcon(achievement.category)}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {achievement.name}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${achievement.points} pts`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {achievement.description}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" gap={1}>
                      <Chip
                        size="small"
                        label={achievement.category}
                        color={getCategoryColor(achievement.category)}
                        variant="outlined"
                      />
                      {achievement.count && achievement.count > 1 && (
                        <Chip
                          size="small"
                          label={`×${achievement.count}`}
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    {achievement.earnedAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(achievement.earnedAt)}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        )}

        {/* Summary Stats */}
        {achievements.length > 0 && (
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <Typography variant="subtitle2" gutterBottom>
              Achievement Summary
            </Typography>
            
            <Box display="flex" flexWrap="wrap" gap={1}>
              {Object.values(AchievementCategory).map(category => {
                const count = achievements.filter(a => a.category === category).length;
                if (count === 0) return null;
                
                return (
                  <Chip
                    key={category}
                    size="small"
                    label={`${category}: ${count}`}
                    color={getCategoryColor(category)}
                    variant="outlined"
                  />
                );
              })}
            </Box>
            
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Total Points from Achievements: {achievements.reduce((sum, a) => sum + a.points, 0)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementTimeline;