import { meter } from './index';

// User engagement metrics
export const userLoginCounter = meter.createCounter('user_login_total', {
  description: 'Total number of user login attempts',
});

export const userLoginSuccessCounter = meter.createCounter('user_login_success_total', {
  description: 'Total number of successful user logins',
});

export const userSessionDuration = meter.createHistogram('user_session_duration_seconds', {
  description: 'Duration of user sessions in seconds',
});

export const activeUsersGauge = meter.createUpDownCounter('user_active_count', {
  description: 'Number of currently active users',
});

export const userRegistrationCounter = meter.createCounter('user_registration_total', {
  description: 'Total number of user registrations',
});

export const userEngagementScore = meter.createHistogram('user_engagement_score', {
  description: 'User engagement score based on activity patterns',
});

// Helper functions to record metrics
export const recordLogin = (success: boolean, userId?: string) => {
  const attributes = { success: success.toString() };
  if (userId) {
    Object.assign(attributes, { user_id: userId });
  }
  
  userLoginCounter.add(1, attributes);
  if (success) {
    userLoginSuccessCounter.add(1, attributes);
  }
};

export const recordSessionDuration = (duration: number, userId: string) => {
  userSessionDuration.record(duration, { user_id: userId });
};

export const updateActiveUsers = (change: number) => {
  activeUsersGauge.add(change);
};

export const recordRegistration = (userId: string, userType: string) => {
  userRegistrationCounter.add(1, { user_id: userId, user_type: userType });
};

export const recordEngagementScore = (score: number, userId: string) => {
  userEngagementScore.record(score, { user_id: userId });
};