/**
 * Progress Overview Component - Shows user's level, XP, and progress charts
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Chip,
  Avatar
} from '@mui/material';
import {
  TrendingUp,
  LocalFireDepartment,
  EmojiEvents
} from '@mui/icons-material';
import {
  // LineChart,
  // Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { UserGameProfile, ProgressData } from '../../types';

interface ProgressOverviewProps {
  profile: UserGameProfile | null;
  progressData: ProgressData[];
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({ profile, progressData }) => {
  if (!profile) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Loading progress...</Typography>
        </CardContent>
      </Card>
    );
  }

  const levelProgress = (profile.currentXp / profile.xpToNextLevel) * 100;
  const nextLevelXp = profile.xpToNextLevel - profile.currentXp;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Progress Overview
        </Typography>

        {/* Level and XP Section */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  mx: 'auto',
                  mb: 1
                }}
              >
                {profile.level}
              </Avatar>
              <Typography variant="h6">Level {profile.level}</Typography>
              <Typography variant="body2" color="text.secondary">
                {profile.totalPoints.toLocaleString()} total points
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">
                  Progress to Level {profile.level + 1}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.currentXp} / {profile.xpToNextLevel} XP
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={levelProgress}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              <Typography variant="caption" color="text.secondary">
                {nextLevelXp} XP needed for next level
              </Typography>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} mt={2}>
              <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                  <LocalFireDepartment color="error" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{profile.streaks.current}</Typography>
                    <Typography variant="caption">Current Streak</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{profile.streaks.longest}</Typography>
                    <Typography variant="caption">Best Streak</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                  <EmojiEvents color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">#{profile.leaderboardRank}</Typography>
                    <Typography variant="caption">Rank</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Progress Chart */}
        {progressData.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              30-Day Progress
            </Typography>
            <Box height={200}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      name === 'points' ? `${value} points` : value,
                      name === 'points' ? 'Points Earned' : 'Level'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="points"
                    stackId="1"
                    stroke="#1976d2"
                    fill="#1976d2"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}

        {/* Streak Information */}
        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>
            Streak Status
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip
              icon={<LocalFireDepartment />}
              label={`${profile.streaks.current} day streak`}
              color={profile.streaks.current >= 7 ? 'success' : profile.streaks.current >= 3 ? 'warning' : 'default'}
              variant="outlined"
            />
            <Chip
              label={`Best: ${profile.streaks.longest} days`}
              variant="outlined"
            />
            <Chip
              label={`Last activity: ${new Date(profile.streaks.lastActivityDate).toLocaleDateString()}`}
              variant="outlined"
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProgressOverview;