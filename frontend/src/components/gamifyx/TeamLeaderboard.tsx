/**
 * Team Leaderboard - Futuristic team ranking with avatars and XP
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import {
  EmojiEvents,
} from '@mui/icons-material';
import { cyberpunkColors } from '../../theme/cyberpunkTheme';
import { LeaderboardItem } from '../common';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  rank: number;
  badges: TeamBadge[];
  streak: number;
  status: 'online' | 'away' | 'offline';
}

interface TeamBadge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TeamLeaderboardProps {
  members: TeamMember[];
}

const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ members }) => {

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <EmojiEvents sx={{ color: cyberpunkColors.primary.main, mr: 2, fontSize: 28 }} />
          <Typography
            variant="h5"
            sx={{
              color: cyberpunkColors.primary.main,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            TEAM LEADERBOARD
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {members.map((member) => (
            <LeaderboardItem
              key={member.id}
              rank={member.rank}
              name={member.name}
              avatar={member.avatar}
              xp={member.xp}
              level={member.level}
              badges={member.badges}
              streak={member.streak}
              status={member.status}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TeamLeaderboard;