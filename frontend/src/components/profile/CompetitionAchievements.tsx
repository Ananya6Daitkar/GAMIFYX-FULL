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
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  Verified as VerifiedIcon,
  Launch as LaunchIcon,
  GitHub as GitHubIcon,
  Info as InfoIcon,
  LocalFireDepartment as FireIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Participation, 
  Competition, 
  CompetitionAchievement, 
  CompetitionType,
  ParticipationStatus 
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

interface CompetitionAchievementsProps {
  userId: string;
  showInProfile?: boolean;
  maxItems?: number;
}

interface CompetitionSummary {
  totalParticipations: number;
  activeParticipations: number;
  completedParticipations: number;
  totalPoints: number;
  totalAchievements: number;
  totalBadges: number;
  bestRank: number | null;
  currentStreak: number;
  longestStreak: number;
}

const CompetitionAchievements: React.FC<CompetitionAchievementsProps> = ({
  userId,
  showInProfile = false,
  maxItems = 5
}) => {
  const theme = useTheme();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [summary, setSummary] = useState<CompetitionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<CompetitionAchievement | null>(null);
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false);

  useEffect(() => {
    loadCompetitionData();
  }, [userId]);

  const loadCompetitionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [participationsData, competitionsData] = await Promise.all([
        competitionApi.getUserParticipations(),
        competitionApi.getCompetitions({ limit: 100 })
      ]);

      setParticipations(participationsData);
      setCompetitions(competitionsData.items);

      // Calculate summary statistics
      const summary: CompetitionSummary = {
        totalParticipations: participationsData.length,
        activeParticipations: participationsData.filter(p => p.status === ParticipationStatus.ACTIVE).length,
        completedParticipations: participationsData.filter(p => p.status === ParticipationStatus.COMPLETED).length,
        totalPoints: participationsData.reduce((sum, p) => sum + p.totalScore, 0),
        totalAchievements: participationsData.reduce((sum, p) => sum + p.achievements.length, 0),
        totalBadges: participationsData.reduce((sum, p) => sum + p.achievements.filter(a => a.name.toLowerCase().includes('badge')).length, 0),
        bestRank: participationsData.reduce((best, p) => p.rank && (!best || p.rank < best) ? p.rank : best, null as number | null),
        currentStreak: Math.max(...participationsData.map(p => p.progress.currentStreak), 0),
        longestStreak: Math.max(...participationsData.map(p => p.progress.longestStreak), 0)
      };

      setSummary(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load competition data');
    } finally {
      setLoading(false);
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

  const handleAchievementClick = (achievement: CompetitionAchievement) => {
    setSelectedAchievement(achievement);
    setAchievementDialogOpen(true);
  };

  const recentAchievements = participations
    .flatMap(p => p.achievements.map(a => ({ ...a, participation: p })))
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, maxItems);

  const activeCompetitions = participations.filter(p => 
    p.status === ParticipationStatus.ACTIVE || p.status === ParticipationStatus.REGISTERED
  );

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Competition Achievements
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
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
              Competition Achievements
            </Typography>
          </Box>
          <Typography color="error" align="center">
            {error}
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button onClick={loadCompetitionData} variant="outlined">
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (participations.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Competition Achievements
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No competition participations yet
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.open('/competitions', '_blank')}
              sx={{ mt: 2 }}
            >
              Explore Competitions
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ 
        background: showInProfile 
          ? `linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)`
          : 'inherit',
        backdropFilter: showInProfile ? 'blur(10px)' : 'none'
      }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                🏆 Competition Achievements
              </Typography>
            </Box>
            <Button
              size="small"
              endIcon={<LaunchIcon />}
              onClick={() => window.open('/competitions', '_blank')}
            >
              View All
            </Button>
          </Box>

          {/* Summary Stats */}
          {summary && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    {summary.totalParticipations}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Competitions
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                    {summary.totalPoints.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Points
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                    {summary.totalAchievements}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Achievements
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                    {summary.bestRank ? `#${summary.bestRank}` : 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best Rank
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                🌟 Recent Achievements
              </Typography>
              <List dense>
                {recentAchievements.map((achievement) => {
                  const competition = competitions.find(c => c.id === achievement.competitionId);
                  return (
                    <ListItem
                      key={achievement.id}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          transform: 'translateX(4px)',
                          transition: 'all 0.2s ease'
                        }
                      }}
                      onClick={() => handleAchievementClick(achievement)}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={achievement.verified ? <VerifiedIcon fontSize="small" /> : null}
                          color="success"
                        >
                          <Avatar sx={{ backgroundColor: theme.palette.warning.main }}>
                            <StarIcon />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {achievement.name}
                            </Typography>
                            <Chip
                              label={`${achievement.points} pts`}
                              size="small"
                              sx={{
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {achievement.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {competition ? `${getCompetitionTypeIcon(competition.type)} ${competition.name}` : 'Competition'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                • {format(new Date(achievement.earnedAt), 'MMM dd, yyyy')}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          {/* Active Competitions */}
          {activeCompetitions.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  🔥 Active Competitions ({activeCompetitions.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {activeCompetitions.map((participation) => {
                    const competition = competitions.find(c => c.id === participation.competitionId);
                    if (!competition) return null;

                    return (
                      <ListItem key={participation.id} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: getStatusColor(participation.status) }}>
                            {getCompetitionTypeIcon(competition.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {competition.name}
                              </Typography>
                              <Chip
                                label={participation.status.toUpperCase()}
                                size="small"
                                sx={{
                                  backgroundColor: getStatusColor(participation.status),
                                  color: 'white',
                                  fontSize: '0.7rem'
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <LinearProgress
                                variant="determinate"
                                value={participation.progress.completionPercentage}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: theme.palette.primary.main,
                                    borderRadius: 3,
                                  },
                                  my: 1
                                }}
                              />
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {Math.round(participation.progress.completionPercentage)}% complete
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {participation.totalScore} pts
                                  </Typography>
                                  {participation.rank && (
                                    <Typography variant="caption" color="text.secondary">
                                      • Rank #{participation.rank}
                                    </Typography>
                                  )}
                                  {participation.progress.currentStreak > 0 && (
                                    <Chip
                                      icon={<FireIcon />}
                                      label={`${participation.progress.currentStreak}d`}
                                      size="small"
                                      sx={{
                                        backgroundColor: theme.palette.error.main,
                                        color: 'white',
                                        height: 16,
                                        fontSize: '0.6rem'
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          }
                        />
                        <Button
                          size="small"
                          startIcon={<LaunchIcon />}
                          onClick={() => window.open(`/competitions/${competition.id}`, '_blank')}
                        >
                          View
                        </Button>
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* External Platform Links */}
          {participations.some(p => p.githubUsername || p.gitlabUsername) && (
            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                External Profiles:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {participations
                  .filter(p => p.githubUsername)
                  .slice(0, 1)
                  .map(p => (
                    <Chip
                      key={`github-${p.githubUsername}`}
                      icon={<GitHubIcon />}
                      label={p.githubUsername}
                      size="small"
                      clickable
                      onClick={() => window.open(`https://github.com/${p.githubUsername}`, '_blank')}
                      sx={{ backgroundColor: theme.palette.grey[800], color: 'white' }}
                    />
                  ))}
                {participations
                  .filter(p => p.gitlabUsername)
                  .slice(0, 1)
                  .map(p => (
                    <Chip
                      key={`gitlab-${p.gitlabUsername}`}
                      label={p.gitlabUsername}
                      size="small"
                      clickable
                      onClick={() => window.open(`https://gitlab.com/${p.gitlabUsername}`, '_blank')}
                      sx={{ backgroundColor: '#FC6D26', color: 'white' }}
                    />
                  ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Achievement Detail Dialog */}
      <Dialog
        open={achievementDialogOpen}
        onClose={() => setAchievementDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAchievement && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ backgroundColor: theme.palette.warning.main }}>
                  <StarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedAchievement.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${selectedAchievement.points} points`}
                      size="small"
                      sx={{ backgroundColor: theme.palette.success.main, color: 'white' }}
                    />
                    {selectedAchievement.verified && (
                      <Chip
                        icon={<VerifiedIcon />}
                        label="Verified"
                        size="small"
                        sx={{ backgroundColor: theme.palette.info.main, color: 'white' }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>
                {selectedAchievement.description}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Earned: {format(new Date(selectedAchievement.earnedAt), 'EEEE, MMMM do, yyyy \'at\' h:mm a')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({formatDistanceToNow(new Date(selectedAchievement.earnedAt), { addSuffix: true })})
                </Typography>
              </Box>

              {competitions.find(c => c.id === selectedAchievement.competitionId) && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                    Competition Details:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {competitions.find(c => c.id === selectedAchievement.competitionId)?.name}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAchievementDialogOpen(false)}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  window.open(`/competitions/${selectedAchievement.competitionId}`, '_blank');
                  setAchievementDialogOpen(false);
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

export default CompetitionAchievements;