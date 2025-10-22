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
  LinearProgress,
  Badge,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Stack,
  Alert
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  Launch as LaunchIcon,
  GitHub as GitHubIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  Flag as FlagIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { 
  Participation, 
  Competition, 
  CompetitionAchievement, 
  CompetitionType,
  ParticipationStatus,
  CompetitionActivity
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

interface CompetitionProfileSectionProps {
  userId: string;
  showFullHistory?: boolean;
  maxTimelineItems?: number;
}

interface CompetitionStats {
  totalParticipations: number;
  activeParticipations: number;
  completedParticipations: number;
  totalPoints: number;
  totalAchievements: number;
  verifiedAchievements: number;
  totalBadges: number;
  bestRank: number | null;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  completionRate: number;
}

interface TimelineEntry {
  id: string;
  type: 'registration' | 'achievement' | 'submission' | 'milestone' | 'completion' | 'verification';
  title: string;
  description: string;
  timestamp: string;
  competitionName: string;
  competitionType: CompetitionType;
  points?: number;
  verified?: boolean;
  metadata?: any;
}

const CompetitionProfileSection: React.FC<CompetitionProfileSectionProps> = ({
  userId,
  showFullHistory = false,
  maxTimelineItems = 10
}) => {
  const theme = useTheme();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<CompetitionAchievement | null>(null);
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    loadCompetitionProfileData();
  }, [userId]);

  const loadCompetitionProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [participationsData, competitionsData, activityData] = await Promise.all([
        competitionApi.getUserParticipations(),
        competitionApi.getCompetitions({ limit: 100 }),
        competitionApi.getUserActivity(50)
      ]);

      setParticipations(participationsData);
      setCompetitions(competitionsData.items);

      // Calculate comprehensive statistics
      const stats = calculateCompetitionStats(participationsData);
      setStats(stats);

      // Build timeline from participations and activities
      const timelineEntries = buildCompetitionTimeline(participationsData, competitionsData.items, activityData);
      setTimeline(timelineEntries);

    } catch (err: any) {
      setError(err.message || 'Failed to load competition profile data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompetitionStats = (participations: Participation[]): CompetitionStats => {
    const totalParticipations = participations.length;
    const activeParticipations = participations.filter(p => p.status === ParticipationStatus.ACTIVE).length;
    const completedParticipations = participations.filter(p => p.status === ParticipationStatus.COMPLETED).length;
    
    const totalPoints = participations.reduce((sum, p) => sum + p.totalScore, 0);
    const totalAchievements = participations.reduce((sum, p) => sum + p.achievements.length, 0);
    const verifiedAchievements = participations.reduce((sum, p) => 
      sum + p.achievements.filter(a => a.verified).length, 0);
    
    const totalBadges = participations.reduce((sum, p) => 
      sum + p.achievements.filter(a => a.name.toLowerCase().includes('badge')).length, 0);
    
    const bestRank = participations.reduce((best, p) => 
      p.rank && (!best || p.rank < best) ? p.rank : best, null as number | null);
    
    const currentStreak = Math.max(...participations.map(p => p.progress.currentStreak), 0);
    const longestStreak = Math.max(...participations.map(p => p.progress.longestStreak), 0);
    
    const averageScore = totalParticipations > 0 ? totalPoints / totalParticipations : 0;
    const completionRate = totalParticipations > 0 ? (completedParticipations / totalParticipations) * 100 : 0;

    return {
      totalParticipations,
      activeParticipations,
      completedParticipations,
      totalPoints,
      totalAchievements,
      verifiedAchievements,
      totalBadges,
      bestRank,
      currentStreak,
      longestStreak,
      averageScore,
      completionRate
    };
  };

  const buildCompetitionTimeline = (
    participations: Participation[], 
    competitions: Competition[], 
    _activities: CompetitionActivity[]
  ): TimelineEntry[] => {
    const entries: TimelineEntry[] = [];

    // Add registration entries
    participations.forEach(participation => {
      const competition = competitions.find(c => c.id === participation.competitionId);
      if (competition) {
        entries.push({
          id: `reg-${participation.id}`,
          type: 'registration',
          title: 'Registered for Competition',
          description: `Joined ${competition.name}`,
          timestamp: participation.registeredAt,
          competitionName: competition.name,
          competitionType: competition.type,
          metadata: { participation, competition }
        });
      }
    });

    // Add achievement entries
    participations.forEach(participation => {
      const competition = competitions.find(c => c.id === participation.competitionId);
      participation.achievements.forEach(achievement => {
        entries.push({
          id: `ach-${achievement.id}`,
          type: 'achievement',
          title: achievement.name,
          description: achievement.description,
          timestamp: achievement.earnedAt,
          competitionName: competition?.name || 'Unknown Competition',
          competitionType: competition?.type || CompetitionType.CUSTOM_COMPETITION,
          points: achievement.points,
          verified: achievement.verified,
          metadata: { achievement, competition }
        });
      });
    });

    // Add completion entries
    participations
      .filter(p => p.status === ParticipationStatus.COMPLETED && p.completedAt)
      .forEach(participation => {
        const competition = competitions.find(c => c.id === participation.competitionId);
        if (competition && participation.completedAt) {
          entries.push({
            id: `comp-${participation.id}`,
            type: 'completion',
            title: 'Competition Completed',
            description: `Finished ${competition.name} with ${participation.totalScore} points`,
            timestamp: participation.completedAt,
            competitionName: competition.name,
            competitionType: competition.type,
            points: participation.totalScore,
            metadata: { participation, competition }
          });
        }
      });

    // Sort by timestamp (newest first)
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <PlayArrowIcon />;
      case 'achievement':
        return <StarIcon />;
      case 'submission':
        return <AssignmentIcon />;
      case 'milestone':
        return <FlagIcon />;
      case 'completion':
        return <CheckCircleIcon />;
      case 'verification':
        return <VerifiedIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getTimelineColor = (type: string) => {
    switch (type) {
      case 'registration':
        return theme.palette.info.main;
      case 'achievement':
        return theme.palette.warning.main;
      case 'submission':
        return theme.palette.primary.main;
      case 'milestone':
        return theme.palette.secondary.main;
      case 'completion':
        return theme.palette.success.main;
      case 'verification':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const handleAchievementClick = (achievement: CompetitionAchievement) => {
    setSelectedAchievement(achievement);
    setAchievementDialogOpen(true);
  };

  const displayedTimeline = showAllTimeline ? timeline : timeline.slice(0, maxTimelineItems);
  const hasMoreTimeline = timeline.length > maxTimelineItems;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🏆 Competition Profile
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
              🏆 Competition Profile
            </Typography>
          </Box>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <Button onClick={loadCompetitionProfileData} variant="outlined">
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
              🏆 Competition Profile
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Ready to compete? 🚀
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Join external competitions like Hacktoberfest to showcase your skills and earn achievements!
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
        background: `linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)`,
        backdropFilter: 'blur(10px)',
        border: `1px solid rgba(255, 255, 255, 0.1)`
      }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrophyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                🏆 Competition Profile
              </Typography>
            </Box>
            <Button
              size="small"
              endIcon={<LaunchIcon />}
              onClick={() => window.open('/competitions', '_blank')}
            >
              View All Competitions
            </Button>
          </Box>

          {/* Statistics Grid */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    {stats.totalParticipations}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Competitions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                    {stats.totalPoints.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Points
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                    {stats.totalAchievements}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Achievements
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                    {stats.verifiedAchievements}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Verified
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                    {stats.bestRank ? `#${stats.bestRank}` : 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best Rank
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                    {Math.round(stats.completionRate)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completion Rate
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Competition History Timeline */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                📅 Competition History
              </Typography>
              {hasMoreTimeline && (
                <Button
                  size="small"
                  onClick={() => setShowAllTimeline(!showAllTimeline)}
                >
                  {showAllTimeline ? 'Show Less' : `Show All (${timeline.length})`}
                </Button>
              )}
            </Box>

            {timeline.length > 0 ? (
              <Timeline position="right">
                {displayedTimeline.map((entry, index) => (
                  <TimelineItem key={entry.id}>
                    <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                      {format(parseISO(entry.timestamp), 'MMM dd, yyyy')}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
                      </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot sx={{ backgroundColor: getTimelineColor(entry.type) }}>
                        {getTimelineIcon(entry.type)}
                      </TimelineDot>
                      {index < displayedTimeline.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid rgba(255, 255, 255, 0.1)`,
                          cursor: entry.type === 'achievement' ? 'pointer' : 'default',
                          '&:hover': entry.type === 'achievement' ? {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            transform: 'translateX(4px)',
                            transition: 'all 0.2s ease'
                          } : {}
                        }}
                        onClick={() => {
                          if (entry.type === 'achievement' && entry.metadata?.achievement) {
                            handleAchievementClick(entry.metadata.achievement);
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {entry.title}
                          </Typography>
                          {entry.verified && (
                            <Chip
                              icon={<VerifiedIcon />}
                              label="Verified"
                              size="small"
                              sx={{
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          )}
                          {entry.points && (
                            <Chip
                              label={`+${entry.points} pts`}
                              size="small"
                              sx={{
                                backgroundColor: theme.palette.warning.main,
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {entry.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {getCompetitionTypeIcon(entry.competitionType)} {entry.competitionName}
                          </Typography>
                        </Box>
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No competition history yet. Start participating to build your timeline!
                </Typography>
              </Box>
            )}
          </Box>

          {/* External Platform Connections */}
          {participations.some(p => p.githubUsername || p.gitlabUsername) && (
            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                🔗 Connected Platforms:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
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
              </Stack>
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
                  Earned: {format(parseISO(selectedAchievement.earnedAt), 'EEEE, MMMM do, yyyy \'at\' h:mm a')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({formatDistanceToNow(parseISO(selectedAchievement.earnedAt), { addSuffix: true })})
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

export default CompetitionProfileSection;