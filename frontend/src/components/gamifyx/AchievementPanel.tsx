/**
 * Achievement Panel - Gamified achievements with progress tracking
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  EmojiEvents,
  Star,
  Lock,
  CheckCircle,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';

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

interface AchievementPanelProps {
  achievements: Achievement[];
}

const AchievementPanel: React.FC<AchievementPanelProps> = ({ achievements }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#B0B0B0';
      case 'rare': return cyberpunkColors.primary.main;
      case 'epic': return '#9C27B0';
      case 'legendary': return '#FFD700';
      default: return cyberpunkColors.text.secondary;
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'rgba(176, 176, 176, 0.3)';
      case 'rare': return `${cyberpunkColors.primary.main}60`;
      case 'epic': return 'rgba(156, 39, 176, 0.6)';
      case 'legendary': return 'rgba(255, 215, 0, 0.6)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <EmojiEvents sx={{ color: cyberpunkColors.warning.main, mr: 2, fontSize: 28 }} />
          <Typography
            variant="h5"
            sx={{
              color: cyberpunkColors.warning.main,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            ACHIEVEMENTS
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              sx={{
                mb: 2,
                background: achievement.unlocked 
                  ? `linear-gradient(135deg, ${getRarityColor(achievement.rarity)}20, transparent)`
                  : cyberpunkColors.surface.glass,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${getRarityColor(achievement.rarity)}40`,
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                opacity: achievement.unlocked ? 1 : 0.7,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  border: `1px solid ${getRarityColor(achievement.rarity)}80`,
                  boxShadow: `0 8px 25px ${getRarityGlow(achievement.rarity)}`,
                },
                '&::before': achievement.unlocked ? {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${getRarityColor(achievement.rarity)}, transparent)`,
                } : {},
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                {/* Header */}
                <Box display="flex" alignItems="flex-start" mb={2}>
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: achievement.unlocked 
                        ? `linear-gradient(135deg, ${getRarityColor(achievement.rarity)}40, ${getRarityColor(achievement.rarity)}20)`
                        : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      border: `1px solid ${getRarityColor(achievement.rarity)}60`,
                      boxShadow: achievement.unlocked ? `0 0 15px ${getRarityGlow(achievement.rarity)}` : 'none',
                      position: 'relative',
                    }}
                  >
                    {achievement.unlocked ? (
                      <Typography variant="h5" sx={{ filter: 'grayscale(0)' }}>
                        {achievement.icon}
                      </Typography>
                    ) : (
                      <Lock sx={{ color: cyberpunkColors.text.secondary, fontSize: 24 }} />
                    )}
                    
                    {achievement.unlocked && (
                      <CheckCircle
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          fontSize: 16,
                          color: cyberpunkColors.success.main,
                          backgroundColor: cyberpunkColors.background.paper,
                          borderRadius: '50%',
                        }}
                      />
                    )}
                  </Box>

                  {/* Content */}
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: achievement.unlocked ? cyberpunkColors.text.primary : cyberpunkColors.text.secondary,
                          fontWeight: 600,
                        }}
                      >
                        {achievement.title}
                      </Typography>
                      <Chip
                        label={achievement.rarity.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getRarityColor(achievement.rarity)}20`,
                          color: getRarityColor(achievement.rarity),
                          border: `1px solid ${getRarityColor(achievement.rarity)}40`,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          textShadow: achievement.rarity === 'legendary' ? `0 0 8px ${getRarityColor(achievement.rarity)}80` : 'none',
                        }}
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        color: cyberpunkColors.text.secondary,
                        mb: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {achievement.description}
                    </Typography>

                    {/* Progress */}
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: cyberpunkColors.text.secondary,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Progress
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: getRarityColor(achievement.rarity),
                            fontWeight: 600,
                          }}
                        >
                          {achievement.progress}/{achievement.maxProgress}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(achievement.progress / achievement.maxProgress) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            background: achievement.unlocked 
                              ? `linear-gradient(90deg, ${getRarityColor(achievement.rarity)}, ${getRarityColor(achievement.rarity)}80)`
                              : `linear-gradient(90deg, ${cyberpunkColors.text.secondary}, ${cyberpunkColors.text.secondary}80)`,
                            borderRadius: 3,
                            boxShadow: achievement.unlocked ? `0 0 8px ${getRarityGlow(achievement.rarity)}` : 'none',
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {achievements.length === 0 && (
          <Box textAlign="center" py={4}>
            <Star sx={{ fontSize: 64, color: cyberpunkColors.text.secondary, mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              No achievements available. Complete tasks to unlock rewards!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementPanel;