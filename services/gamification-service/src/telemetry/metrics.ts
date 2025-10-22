import { meter } from './index';

// Gamification metrics
export const pointsAwardedCounter = meter.createCounter('points_awarded_total', {
  description: 'Total points awarded to users',
});

export const badgesEarnedCounter = meter.createCounter('badges_earned_total', {
  description: 'Total badges earned by users',
});

export const leaderboardPositionChanges = meter.createCounter('leaderboard_position_changes_total', {
  description: 'Total number of leaderboard position changes',
});

export const achievementUnlockedCounter = meter.createCounter('achievement_unlocked_total', {
  description: 'Total achievements unlocked by users',
});

export const userEngagementLevel = meter.createHistogram('user_engagement_level', {
  description: 'User engagement level based on gamification activities',
  boundaries: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
});

export const streakLengthHistogram = meter.createHistogram('user_streak_length', {
  description: 'Length of user activity streaks',
  boundaries: [1, 3, 7, 14, 30, 60, 90, 180, 365],
});

export const leaderboardRankGauge = meter.createUpDownCounter('leaderboard_rank', {
  description: 'Current leaderboard rank of users',
});

// Helper functions to record metrics
export const recordPointsAwarded = (points: number, userId: string, reason: string) => {
  pointsAwardedCounter.add(points, { 
    user_id: userId,
    reason: reason 
  });
};

export const recordBadgeEarned = (badgeType: string, userId: string, difficulty: string) => {
  badgesEarnedCounter.add(1, { 
    badge_type: badgeType,
    user_id: userId,
    difficulty: difficulty 
  });
};

export const recordLeaderboardChange = (userId: string, oldRank: number, newRank: number) => {
  leaderboardPositionChanges.add(1, { 
    user_id: userId,
    direction: newRank < oldRank ? 'up' : 'down',
    rank_change: Math.abs(newRank - oldRank).toString()
  });
  
  leaderboardRankGauge.add(newRank - oldRank, { user_id: userId });
};

export const recordAchievementUnlocked = (achievementType: string, userId: string) => {
  achievementUnlockedCounter.add(1, { 
    achievement_type: achievementType,
    user_id: userId 
  });
};

export const recordEngagementLevel = (level: number, userId: string) => {
  userEngagementLevel.record(level, { user_id: userId });
};

export const recordStreakLength = (streakLength: number, userId: string, streakType: string) => {
  streakLengthHistogram.record(streakLength, { 
    user_id: userId,
    streak_type: streakType 
  });
};