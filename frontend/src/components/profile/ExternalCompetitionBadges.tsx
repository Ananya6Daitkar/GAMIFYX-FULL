import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Paper,
  Stack,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  Launch as LaunchIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, parseISO } from 'date-fns';
import { 
  CompetitionAchievement, 
  CompetitionBadge, 
  Competition,
  CompetitionType,
  Participation
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

interface ExternalCompetitionBadgesProps {
  userId: string;
  maxBadges?: number;
  showVerificationStatus?: boolean;
}

interface BadgeWithDetails extends CompetitionBadge {
  competition: Competition;
  participation: Participation;
  achievement?: CompetitionAchievement;
  verificationStatus: 'verified' | 'pending' | 'failed' | 'not_verified';
  externalUrl?: string | undefined;
}

const ExternalCompetitionBadges: React.FC<ExternalCompetitionBadgesProps> = ({
  userId,
  maxBadges = 12,
  showVerificationStatus = true
}) => {
  const theme = useTheme();
  const [badges, setBadges] = useState<BadgeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithDetails | null>(null);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);

  useEffect(() => {
    loadExternalBadges();
  }, [userId]);

  const loadExternalBadges = async () => {
    try {
      setLoading(true);
      setError(null);

      const [participationsData, competitionsData] = await Promise.all([
        competitionApi.getUserParticipations(),
        competitionApi.getCompetitions({ limit: 100 })
      ]);

      // Build badges with verification details
      const badgesWithDetails: BadgeWithDetails[] = [];

      participationsData.forEach(participation => {
        const competition = competitionsData.items.find(c => c.id === participation.competitionId);
        if (!competition) return;

        // Add competition badges earned through achievements
        participation.achievements.forEach(achievement => {
          const badge = competition.badges.find(b => 
            b.name.toLowerCase().includes(achievement.name.toLowerCase()) ||
            achievement.name.toLowerCase().includes('badge')
          );

          if (badge) {
            badgesWithDetails.push({
              ...badge,
              competition,
              participation,
              achievement,
              verificationStatus: achievement.verified ? 'verified' : 'pending',
              externalUrl: getExternalBadgeUrl(competition, achievement)
            });
          }
        });

        // Add general competition badges
        competition.badges.forEach(badge => {
          const hasAchievement = participation.achievements.some(a => 
            a.name.toLowerCase().includes(badge.name.toLowerCase())
          );

          if (hasAchievement) {
            const existingBadge = badgesWithDetails.find(b => b.id === badge.id);
            if (!existingBadge) {
              badgesWithDetails.push({
                ...badge,
                competition,
                participation,
                verificationStatus: 'verified',
                externalUrl: getExternalBadgeUrl(competition, badge)
              });
            }
          }
        });
      });

      // Sort by rarity and verification status
      const sortedBadges = badgesWithDetails
        .sort((a, b) => {
          const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
          const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
          if (rarityDiff !== 0) return rarityDiff;
          
          const verificationOrder = { verified: 3, pending: 2, failed: 1, not_verified: 0 };
          return verificationOrder[b.verificationStatus] - verificationOrder[a.verificationStatus];
        })
        .slice(0, maxBadges);

      setBadges(sortedBadges);

    } catch (err: any) {
      setError(err.message || 'Failed to load external badges');
    } finally {
      setLoading(false);
    }
  };

  const getExternalBadgeUrl = (competition: Competition, item: any): string | undefined => {
    switch (competition.type) {
      case CompetitionType.HACKTOBERFEST:
        return `https://hacktoberfest.com/profile/${item.githubUsername || 'user'}`;
      case CompetitionType.GITHUB_GAME_OFF:
        return `https://github.com/github-game-off`;
      case CompetitionType.GITLAB_HACKATHON:
        return `https://gitlab.com/gitlab-org/hackathons`;
      default:
        return competition.website;
    }
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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return '#FFD700'; // Gold
      case 'epic':
        return '#9C27B0'; // Purple
      case 'rare':
        return '#2196F3'; // Blue
      case 'uncommon':
        return '#4CAF50'; // Green
      case 'common':
        return '#9E9E9E'; // Grey
      default:
        return theme.palette.primary.main;
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <VerifiedIcon sx={{ color: theme.palette.success.main }} />;
      case 'pending':
        return <ScheduleIcon sx={{ color: theme.palette.warning.main }} />;
      case 'failed':
        return <CancelIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <WarningIcon sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const handleBadgeClick = (badge: BadgeWithDetails) => {
    setSelectedBadge(badge);
    setBadgeDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🏅 External Competition Badges
            </Typography>
          </Box>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🏅 External Competition Badges
            </Typography>
          </Box>
          <Typography color="error" align="center">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🏅 External Competition Badges
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No external badges earned yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Participate in competitions to earn verified badges!
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                🏅 External Competition Badges
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {badges.filter(b => b.verificationStatus === 'verified').length} verified
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {badges.map((badge) => (
              <Grid item xs={6} sm={4} md={3} key={`${badge.id}-${badge.competition.id}`}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: `2px solid ${getRarityColor(badge.rarity)}`,
                    borderRadius: 2,
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      transform: 'translateY(-4px)',
                      transition: 'all 0.2s ease',
                      boxShadow: `0 8px 25px rgba(${getRarityColor(badge.rarity)}, 0.3)`
                    }
                  }}
                  onClick={() => handleBadgeClick(badge)}
                >
                  {/* Verification Status */}
                  {showVerificationStatus && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <Tooltip title={`Status: ${badge.verificationStatus}`}>
                        <IconButton size="small">
                          {getVerificationIcon(badge.verificationStatus)}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  {/* Badge Image/Icon */}
                  <Badge
                    badgeContent={getCompetitionTypeIcon(badge.competition.type)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  >
                    <Avatar
                      src={badge.imageUrl}
                      sx={{
                        width: 60,
                        height: 60,
                        mx: 'auto',
                        mb: 1,
                        backgroundColor: getRarityColor(badge.rarity),
                        border: `2px solid ${getRarityColor(badge.rarity)}`
                      }}
                    >
                      <StarIcon />
                    </Avatar>
                  </Badge>

                  {/* Badge Name */}
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 'bold',
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {badge.name}
                  </Typography>

                  {/* Competition Name */}
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {badge.competition.name}
                  </Typography>

                  {/* Rarity and Points */}
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Chip
                      label={badge.rarity.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getRarityColor(badge.rarity),
                        color: 'white',
                        fontSize: '0.6rem',
                        height: 20
                      }}
                    />
                    <Chip
                      label={`${badge.points}pts`}
                      size="small"
                      sx={{
                        backgroundColor: theme.palette.success.main,
                        color: 'white',
                        fontSize: '0.6rem',
                        height: 20
                      }}
                    />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Show more button if there are more badges */}
          {badges.length === maxBadges && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => window.open('/competitions/badges', '_blank')}
              >
                View All Badges
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Badge Detail Dialog */}
      <Dialog
        open={badgeDialogOpen}
        onClose={() => setBadgeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedBadge && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedBadge.imageUrl}
                  sx={{
                    width: 60,
                    height: 60,
                    backgroundColor: getRarityColor(selectedBadge.rarity),
                    border: `2px solid ${getRarityColor(selectedBadge.rarity)}`
                  }}
                >
                  <StarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedBadge.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={selectedBadge.rarity.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getRarityColor(selectedBadge.rarity),
                        color: 'white'
                      }}
                    />
                    <Chip
                      label={`${selectedBadge.points} points`}
                      size="small"
                      sx={{ backgroundColor: theme.palette.success.main, color: 'white' }}
                    />
                    {getVerificationIcon(selectedBadge.verificationStatus)}
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>
                {selectedBadge.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Competition Details:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2">
                    {getCompetitionTypeIcon(selectedBadge.competition.type)} {selectedBadge.competition.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {selectedBadge.competition.description}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Verification Status:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getVerificationIcon(selectedBadge.verificationStatus)}
                  <Typography variant="body2" color="text.secondary">
                    {selectedBadge.verificationStatus.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Box>
              </Box>

              {selectedBadge.achievement && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                    Achievement Details:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Earned: {format(parseISO(selectedBadge.achievement.earnedAt), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}

              <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Badge Criteria: {selectedBadge.criteria}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBadgeDialogOpen(false)}>
                Close
              </Button>
              {selectedBadge.externalUrl && (
                <Button
                  variant="contained"
                  startIcon={<LaunchIcon />}
                  onClick={() => {
                    window.open(selectedBadge.externalUrl, '_blank');
                    setBadgeDialogOpen(false);
                  }}
                >
                  View External
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default ExternalCompetitionBadges;