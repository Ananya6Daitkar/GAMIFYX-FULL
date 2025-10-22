import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Launch as LaunchIcon,
  GitHub as GitHubIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Competition, Participation, CompetitionStatus, CompetitionType } from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';
import { formatDistanceToNow, format } from 'date-fns';

interface CompetitionCardProps {
  competition: Competition;
  userParticipation?: Participation;
  onRegistrationChange?: () => void;
}

const CompetitionCard: React.FC<CompetitionCardProps> = ({
  competition,
  userParticipation,
  onRegistrationChange
}) => {
  const theme = useTheme();
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [gitlabUsername, setGitlabUsername] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusColor = (status: CompetitionStatus) => {
    switch (status) {
      case CompetitionStatus.ACTIVE:
        return theme.palette.success.main;
      case CompetitionStatus.UPCOMING:
        return theme.palette.info.main;
      case CompetitionStatus.COMPLETED:
        return theme.palette.grey[500];
      case CompetitionStatus.CANCELLED:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTypeIcon = (type: CompetitionType) => {
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

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return theme.palette.success.main;
      case 'intermediate':
        return theme.palette.warning.main;
      case 'advanced':
        return theme.palette.error.main;
      case 'expert':
        return theme.palette.error.dark;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);

    if (now < startDate) {
      return `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`;
    } else if (now < endDate) {
      return `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`;
    } else {
      return 'Ended';
    }
  };

  const getRegistrationStatus = () => {
    if (userParticipation) {
      return {
        registered: true,
        status: userParticipation.status,
        progress: userParticipation.progress.completionPercentage
      };
    }

    const now = new Date();
    const registrationDeadline = competition.registrationDeadline 
      ? new Date(competition.registrationDeadline)
      : new Date(competition.startDate);

    return {
      registered: false,
      canRegister: now < registrationDeadline && competition.status !== CompetitionStatus.COMPLETED,
      registrationClosed: now >= registrationDeadline
    };
  };

  const handleRegistration = async () => {
    try {
      setRegistering(true);
      setError(null);

      await competitionApi.registerForCompetition({
        competitionId: competition.id,
        githubUsername: githubUsername || undefined,
        gitlabUsername: gitlabUsername || undefined
      });

      setRegistrationDialogOpen(false);
      onRegistrationChange?.();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!userParticipation) return;

    try {
      await competitionApi.unregisterFromCompetition(competition.id);
      onRegistrationChange?.();
    } catch (err: any) {
      setError(err.message || 'Unregistration failed');
    }
  };

  const registrationStatus = getRegistrationStatus();

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.palette.primary.main}20`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px ${theme.palette.primary.main}40`,
            border: `1px solid ${theme.palette.primary.main}60`,
          }
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" component="span">
                {getTypeIcon(competition.type)}
              </Typography>
              <Chip
                label={competition.status.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: getStatusColor(competition.status),
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>
            {competition.website && (
              <IconButton
                size="small"
                onClick={() => window.open(competition.website, '_blank')}
                sx={{ color: theme.palette.primary.main }}
              >
                <LaunchIcon />
              </IconButton>
            )}
          </Box>

          <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            {competition.name}
          </Typography>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {competition.description}
          </Typography>
        </Box>

        {/* Content */}
        <CardContent sx={{ flexGrow: 1, pt: 0 }}>
          {/* Progress for registered users */}
          {registrationStatus.registered && userParticipation && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(registrationStatus.progress || 0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={registrationStatus.progress || 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 4,
                  }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Score: {userParticipation.totalScore} pts
                </Typography>
                {userParticipation.rank && (
                  <Typography variant="caption" color="text.secondary">
                    Rank: #{userParticipation.rank}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Competition Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                {getTimeRemaining()}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                {competition.participantCount} participants
                {competition.maxParticipants && ` / ${competition.maxParticipants}`}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrophyIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                {competition.rewards.length} rewards available
              </Typography>
            </Box>
          </Box>

          {/* Tags and Difficulty */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              label={competition.difficultyLevel}
              size="small"
              sx={{
                backgroundColor: getDifficultyColor(competition.difficultyLevel),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            {competition.tags.slice(0, 2).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
              />
            ))}
            {competition.tags.length > 2 && (
              <Chip
                label={`+${competition.tags.length - 2}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: theme.palette.grey[500], color: theme.palette.grey[500] }}
              />
            )}
          </Box>

          {/* Requirements Preview */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Requirements ({competition.requirements.length}):
            </Typography>
            <Box sx={{ pl: 1 }}>
              {competition.requirements.slice(0, 2).map((req, index) => (
                <Typography key={index} variant="caption" color="text.secondary" display="block">
                  • {req.description}
                </Typography>
              ))}
              {competition.requirements.length > 2 && (
                <Typography variant="caption" color="text.secondary">
                  ... and {competition.requirements.length - 2} more
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ p: 2, pt: 0 }}>
          {registrationStatus.registered ? (
            <Box sx={{ display: 'flex', width: '100%', gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<CheckIcon />}
                sx={{
                  backgroundColor: theme.palette.success.main,
                  '&:hover': { backgroundColor: theme.palette.success.dark }
                }}
                onClick={() => window.open(`/competitions/${competition.id}`, '_blank')}
              >
                View Progress
              </Button>
              <Tooltip title="Unregister from competition">
                <IconButton
                  onClick={handleUnregister}
                  sx={{ color: theme.palette.error.main }}
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            </Box>
          ) : registrationStatus.canRegister ? (
            <Button
              variant="contained"
              fullWidth
              onClick={() => setRegistrationDialogOpen(true)}
              sx={{
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                }
              }}
            >
              Register Now
            </Button>
          ) : (
            <Button
              variant="outlined"
              fullWidth
              disabled
              startIcon={<InfoIcon />}
            >
              {registrationStatus.registrationClosed ? 'Registration Closed' : 'Completed'}
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Registration Dialog */}
      <Dialog
        open={registrationDialogOpen}
        onClose={() => setRegistrationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Register for {competition.name}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Connect your external accounts to track your contributions automatically.
          </Typography>

          {(competition.type === CompetitionType.HACKTOBERFEST || 
            competition.type === CompetitionType.GITHUB_GAME_OFF ||
            competition.type === CompetitionType.OPEN_SOURCE_CHALLENGE) && (
            <TextField
              fullWidth
              label="GitHub Username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="your-github-username"
              InputProps={{
                startAdornment: <GitHubIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ mb: 2 }}
            />
          )}

          {competition.type === CompetitionType.GITLAB_HACKATHON && (
            <TextField
              fullWidth
              label="GitLab Username"
              value={gitlabUsername}
              onChange={(e) => setGitlabUsername(e.target.value)}
              placeholder="your-gitlab-username"
              sx={{ mb: 2 }}
            />
          )}

          <Typography variant="body2" color="text.secondary">
            By registering, you agree to the competition rules and terms.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegistrationDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRegistration}
            disabled={registering}
          >
            {registering ? 'Registering...' : 'Register'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CompetitionCard;