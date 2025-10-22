import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Paper,
  Divider,
  Button
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  Flag as FlagIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { CompetitionActivity } from '../../types/competition';
import { format, formatDistanceToNow } from 'date-fns';

interface CompetitionActivityProps {
  activities: CompetitionActivity[];
  onRefresh?: () => void;
}

const CompetitionActivity: React.FC<CompetitionActivityProps> = ({ 
  activities, 
  onRefresh 
}) => {
  const theme = useTheme();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <TrophyIcon />;
      case 'submission':
        return <AssignmentIcon />;
      case 'achievement':
        return <StarIcon />;
      case 'milestone':
        return <FlagIcon />;
      case 'completion':
        return <CheckIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration':
        return theme.palette.info.main;
      case 'submission':
        return theme.palette.primary.main;
      case 'achievement':
        return theme.palette.warning.main;
      case 'milestone':
        return theme.palette.success.main;
      case 'completion':
        return theme.palette.secondary.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'registration':
        return '📝 Registration';
      case 'submission':
        return '📤 Submission';
      case 'achievement':
        return '🏆 Achievement';
      case 'milestone':
        return '🎯 Milestone';
      case 'completion':
        return '✅ Completion';
      default:
        return '📋 Activity';
    }
  };

  if (activities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No recent activity
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Your competition activities will appear here
        </Typography>
        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            sx={{ mt: 2 }}
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = format(new Date(activity.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, CompetitionActivity[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          📈 Recent Activity
        </Typography>
        {onRefresh && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            sx={{ 
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main 
            }}
          >
            Refresh
          </Button>
        )}
      </Box>

      {/* Activity Timeline */}
      <Timeline>
        {sortedDates.map((date, dateIndex) => (
          <React.Fragment key={date}>
            {/* Date Header */}
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot 
                  sx={{ 
                    backgroundColor: theme.palette.secondary.main,
                    color: 'white',
                    fontWeight: 'bold',
                    width: 40,
                    height: 40
                  }}
                >
                  📅
                </TimelineDot>
                {dateIndex < sortedDates.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {format(new Date(date), 'EEEE, MMMM do, yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDistanceToNow(new Date(date), { addSuffix: true })}
                </Typography>
              </TimelineContent>
            </TimelineItem>

            {/* Activities for this date */}
            {groupedActivities[date].map((activity, activityIndex) => (
              <TimelineItem key={activity.id}>
                <TimelineSeparator>
                  <TimelineDot 
                    sx={{ 
                      backgroundColor: getActivityColor(activity.type),
                      color: 'white'
                    }}
                  >
                    {getActivityIcon(activity.type)}
                  </TimelineDot>
                  {(dateIndex < sortedDates.length - 1 || 
                    activityIndex < groupedActivities[date].length - 1) && (
                    <TimelineConnector />
                  )}
                </TimelineSeparator>
                <TimelineContent>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      mb: 2,
                      background: `linear-gradient(135deg, ${getActivityColor(activity.type)}10 0%, ${getActivityColor(activity.type)}05 100%)`,
                      border: `1px solid ${getActivityColor(activity.type)}20`,
                      '&:hover': {
                        transform: 'translateX(4px)',
                        transition: 'all 0.2s ease',
                        boxShadow: `0 4px 20px ${getActivityColor(activity.type)}30`
                      }
                    }}
                  >
                    {/* Activity Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {getActivityTitle(activity.type)}
                        </Typography>
                        <Chip
                          label={activity.competitionName}
                          size="small"
                          sx={{
                            backgroundColor: theme.palette.primary.main,
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(activity.timestamp), 'HH:mm')}
                      </Typography>
                    </Box>

                    {/* Activity Description */}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {activity.description}
                    </Typography>

                    {/* Points and Metadata */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      {activity.points && (
                        <Chip
                          label={`+${activity.points} points`}
                          size="small"
                          sx={{
                            backgroundColor: theme.palette.success.main,
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                      
                      {activity.metadata?.badge && (
                        <Chip
                          label={`Badge: ${activity.metadata.badge}`}
                          size="small"
                          sx={{
                            backgroundColor: theme.palette.warning.main,
                            color: 'white'
                          }}
                        />
                      )}
                      
                      {activity.metadata?.rank && (
                        <Chip
                          label={`Rank #${activity.metadata.rank}`}
                          size="small"
                          sx={{
                            backgroundColor: theme.palette.info.main,
                            color: 'white'
                          }}
                        />
                      )}
                      
                      {activity.metadata?.streak && (
                        <Chip
                          label={`${activity.metadata.streak} day streak`}
                          size="small"
                          sx={{
                            backgroundColor: theme.palette.error.main,
                            color: 'white'
                          }}
                        />
                      )}
                    </Box>

                    {/* Additional Details */}
                    {activity.metadata?.details && (
                      <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {activity.metadata.details}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
          </React.Fragment>
        ))}
      </Timeline>

      {/* Activity Summary */}
      <Card sx={{ 
        mt: 4,
        background: `linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)`,
        backdropFilter: 'blur(10px)'
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            📊 Activity Summary
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {Object.entries(
              activities.reduce((counts, activity) => {
                counts[activity.type] = (counts[activity.type] || 0) + 1;
                return counts;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <Chip
                key={type}
                label={`${getActivityTitle(type).split(' ')[1]}: ${count}`}
                sx={{
                  backgroundColor: getActivityColor(type),
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                {activities.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Activities
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                {activities.reduce((sum, activity) => sum + (activity.points || 0), 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Points Earned
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                {new Set(activities.map(a => a.competitionId)).size}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Competitions
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                {activities.filter(a => a.type === 'achievement').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Achievements
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompetitionActivity;