import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Competition, Participation, ParticipationStatus } from '../../types/competition';
import { format, formatDistanceToNow } from 'date-fns';

interface CompetitionProgressProps {
  participations: Participation[];
  competitions: Competition[];
}

interface ProgressCardProps {
  participation: Participation;
  competition: Competition;
}

const ProgressCard: React.FC<ProgressCardProps> = ({ participation, competition }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: ParticipationStatus) => {
    switch (status) {
      case ParticipationStatus.ACTIVE:
        return theme.palette.success.main;
      case ParticipationStatus.COMPLETED:
        return theme.palette.info.main;
      case ParticipationStatus.REGISTERED:
        return theme.palette.warning.main;
      case ParticipationStatus.WITHDRAWN:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return theme.palette.success.main;
    if (percentage >= 50) return theme.palette.warning.main;
    if (percentage >= 25) return theme.palette.info.main;
    return theme.palette.error.main;
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const endDate = new Date(competition.endDate);
    
    if (now > endDate) {
      return 'Ended';
    }
    
    return `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`;
  };

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)`,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${theme.palette.primary.main}20`,
        mb: 2
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                backgroundColor: getStatusColor(participation.status),
                width: 48,
                height: 48
              }}
            >
              <TrophyIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {competition.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={participation.status.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getStatusColor(participation.status),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {getTimeRemaining()}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {participation.totalScore}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              points
            </Typography>
            {participation.rank && (
              <Typography variant="caption" color="text.secondary" display="block">
                Rank #{participation.rank}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(participation.progress.completionPercentage)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={participation.progress.completionPercentage}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getProgressColor(participation.progress.completionPercentage),
                borderRadius: 5,
              }
            }}
          />
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {participation.progress.completedRequirements.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {participation.progress.totalRequirements}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {participation.achievements.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Achievements
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {participation.progress.currentStreak}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Streak
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Expand Button */}
        <Button
          fullWidth
          variant="outlined"
          onClick={() => setExpanded(!expanded)}
          endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />}
          sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
        >
          {expanded ? 'Show Less' : 'Show Details'}
        </Button>

        {/* Expanded Content */}
        {expanded && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 3 }} />
            
            {/* Requirements Progress */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Requirements Progress
            </Typography>
            <List dense>
              {competition.requirements.map((requirement) => {
                const isCompleted = participation.progress.completedRequirements.includes(requirement.id);
                return (
                  <ListItem key={requirement.id}>
                    <ListItemIcon>
                      {isCompleted ? (
                        <CheckIcon sx={{ color: theme.palette.success.main }} />
                      ) : (
                        <UncheckedIcon sx={{ color: theme.palette.grey[500] }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={requirement.description}
                      secondary={`${requirement.points} points • ${requirement.type}`}
                      sx={{
                        '& .MuiListItemText-primary': {
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted ? theme.palette.success.main : 'inherit'
                        }
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>

            {/* Recent Achievements */}
            {participation.achievements.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                  🏆 Recent Achievements
                </Typography>
                <Timeline>
                  {participation.achievements.slice(0, 3).map((achievement, index) => (
                    <TimelineItem key={achievement.id}>
                      <TimelineSeparator>
                        <TimelineDot sx={{ backgroundColor: theme.palette.success.main }}>
                          <StarIcon fontSize="small" />
                        </TimelineDot>
                        {index < participation.achievements.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Paper elevation={1} sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {achievement.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {achievement.description}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Chip
                              label={`${achievement.points} points`}
                              size="small"
                              sx={{ backgroundColor: theme.palette.success.main, color: 'white' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(achievement.earnedAt), 'MMM dd, yyyy')}
                            </Typography>
                          </Box>
                        </Paper>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </>
            )}

            {/* Recent Submissions */}
            {participation.submissions.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                  📤 Recent Submissions
                </Typography>
                <List dense>
                  {participation.submissions.slice(0, 3).map((submission) => (
                    <ListItem key={submission.id}>
                      <ListItemIcon>
                        <AssignmentIcon sx={{ color: theme.palette.info.main }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={submission.title}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={submission.status}
                              size="small"
                              sx={{
                                backgroundColor: submission.status === 'approved' 
                                  ? theme.palette.success.main 
                                  : submission.status === 'pending'
                                  ? theme.palette.warning.main
                                  : theme.palette.error.main,
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {submission.score}/{submission.maxScore} points
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {format(new Date(submission.submittedAt), 'MMM dd')}
                            </Typography>
                          </Box>
                        }
                      />
                      <Button
                        size="small"
                        startIcon={<LaunchIcon />}
                        onClick={() => window.open(submission.url, '_blank')}
                      >
                        View
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Milestones */}
            {participation.progress.milestones.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                  🎯 Milestones
                </Typography>
                <Grid container spacing={2}>
                  {participation.progress.milestones.map((milestone) => (
                    <Grid item xs={12} sm={6} key={milestone.id}>
                      <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {milestone.achievedAt ? (
                              <CheckIcon sx={{ color: theme.palette.success.main }} />
                            ) : (
                              <ScheduleIcon sx={{ color: theme.palette.warning.main }} />
                            )}
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {milestone.name}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {milestone.description}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={milestone.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: milestone.achievedAt 
                                  ? theme.palette.success.main 
                                  : theme.palette.warning.main,
                                borderRadius: 3,
                              }
                            }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(milestone.progress)}% complete
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {milestone.points} points
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const CompetitionProgress: React.FC<CompetitionProgressProps> = ({ participations, competitions }) => {
  const theme = useTheme();

  const activeParticipations = participations.filter(p => 
    p.status === ParticipationStatus.ACTIVE || p.status === ParticipationStatus.REGISTERED
  );
  
  const completedParticipations = participations.filter(p => 
    p.status === ParticipationStatus.COMPLETED
  );

  if (participations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No competition participations yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Register for competitions to start tracking your progress
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Active Competitions */}
      {activeParticipations.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            🔥 Active Competitions ({activeParticipations.length})
          </Typography>
          {activeParticipations.map((participation) => {
            const competition = competitions.find(c => c.id === participation.competitionId);
            if (!competition) return null;
            
            return (
              <ProgressCard
                key={participation.id}
                participation={participation}
                competition={competition}
              />
            );
          })}
        </Box>
      )}

      {/* Completed Competitions */}
      {completedParticipations.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            ✅ Completed Competitions ({completedParticipations.length})
          </Typography>
          {completedParticipations.map((participation) => {
            const competition = competitions.find(c => c.id === participation.competitionId);
            if (!competition) return null;
            
            return (
              <ProgressCard
                key={participation.id}
                participation={participation}
                competition={competition}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default CompetitionProgress;