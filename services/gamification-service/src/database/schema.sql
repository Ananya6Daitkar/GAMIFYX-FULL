-- Gamification Service Database Schema

-- Enhanced User game profiles with cyberpunk features
CREATE TABLE IF NOT EXISTS user_game_profiles (
    user_id VARCHAR(255) PRIMARY KEY,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    xp_to_next_level INTEGER DEFAULT 100,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leaderboard_rank INTEGER DEFAULT 0,
    -- Enhanced cyberpunk features
    prestige_level INTEGER DEFAULT 0,
    cyberpunk_theme JSONB DEFAULT '{"selectedTheme": "neon-blue", "customColors": {"primary": "#00FFFF", "secondary": "#FF00FF", "accent": "#FFFF00", "background": "#000011"}, "effectsEnabled": true, "animationSpeed": "normal"}',
    visual_preferences JSONB DEFAULT '{"showAnimations": true, "showParticleEffects": true, "soundEnabled": true, "celebrationStyle": "standard", "dashboardLayout": "standard"}',
    team_affiliation JSONB,
    seasonal_stats JSONB DEFAULT '{"currentSeason": "2024-1", "seasonStartDate": "2024-01-01", "seasonPoints": 0, "seasonRank": 0, "seasonBadges": 0, "previousSeasons": []}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Badges with cyberpunk themes and visual effects
CREATE TABLE IF NOT EXISTS badges (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    category VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL,
    rarity VARCHAR(50) DEFAULT 'common',
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    -- Enhanced cyberpunk features
    theme JSONB DEFAULT '{"primaryColor": "#4A90E2", "secondaryColor": "#7ED321", "glowColor": "#4A90E2", "backgroundPattern": "dots", "cyberpunkStyle": "neon"}',
    visual_effects JSONB DEFAULT '{"glowIntensity": 20, "animationType": "pulse", "particleEffects": false, "celebrationDuration": 2000}',
    showcase_features JSONB DEFAULT '{"isShowcased": false, "showcasePosition": 0, "unlockDate": "2024-01-01"}',
    rarity_level INTEGER DEFAULT 1,
    max_earners INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_id VARCHAR(255) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 100,
    metadata JSONB,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL,
    points INTEGER DEFAULT 0,
    is_repeatable BOOLEAN DEFAULT false,
    cooldown_hours INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    achievement_id VARCHAR(255) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    count INTEGER DEFAULT 1,
    metadata JSONB,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

-- Point transactions
CREATE TABLE IF NOT EXISTS point_transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    points INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    source VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    threshold INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    badge_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE SET NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_game_profiles_total_points ON user_game_profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_game_profiles_level ON user_game_profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_game_profiles_updated_at BEFORE UPDATE ON user_game_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default badges
INSERT INTO badges (id, name, description, category, criteria, rarity, points) VALUES
('first-submission', 'First Steps', 'Complete your first code submission', 'milestone', '{"type": "submission_count", "threshold": 1}', 'common', 50),
('code-quality-bronze', 'Quality Coder Bronze', 'Achieve 80+ code quality score', 'coding', '{"type": "code_quality", "threshold": 80}', 'common', 100),
('code-quality-silver', 'Quality Coder Silver', 'Achieve 90+ code quality score', 'coding', '{"type": "code_quality", "threshold": 90}', 'uncommon', 200),
('code-quality-gold', 'Quality Coder Gold', 'Achieve 95+ code quality score', 'coding', '{"type": "code_quality", "threshold": 95}', 'rare', 500),
('security-champion', 'Security Champion', 'Achieve perfect security score', 'security', '{"type": "security_score", "threshold": 100}', 'epic', 300),
('streak-warrior', 'Streak Warrior', 'Maintain a 7-day submission streak', 'consistency', '{"type": "streak", "threshold": 7}', 'uncommon', 250),
('hundred-submissions', 'Century Club', 'Complete 100 submissions', 'milestone', '{"type": "submission_count", "threshold": 100}', 'rare', 1000),
('perfectionist', 'Perfectionist', 'Get 100% on 10 submissions', 'quality', '{"type": "perfect_scores", "threshold": 10}', 'epic', 750)
ON CONFLICT (id) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (id, name, description, category, criteria, points, is_repeatable) VALUES
('daily-coder', 'Daily Coder', 'Submit code every day this week', 'consistency', '{"type": "daily_submissions", "timeframe": "weekly"}', 100, true),
('quick-learner', 'Quick Learner', 'Implement feedback within 1 hour', 'improvement', '{"type": "quick_feedback_implementation", "threshold": 3600}', 75, true),
('helper', 'Helper', 'Help a fellow student', 'social', '{"type": "peer_help"}', 50, true),
('improver', 'Improver', 'Increase code quality by 20 points', 'improvement', '{"type": "quality_improvement", "threshold": 20}', 150, true)
ON CONFLICT (id) DO NOTHING;

-- Enhanced streak tracking tables
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id VARCHAR(255) NOT NULL,
    streak_type VARCHAR(50) NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, streak_type)
);

CREATE TABLE IF NOT EXISTS streak_milestones (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    streak_type VARCHAR(50) NOT NULL,
    milestone_days INTEGER NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bonus_points INTEGER DEFAULT 0,
    special_reward TEXT
);

CREATE TABLE IF NOT EXISTS streak_challenges (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    streak_type VARCHAR(50) NOT NULL,
    target_streak INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    rewards JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table for collaborative features
CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(255) PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(255) NOT NULL,
    max_members INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard history for tracking rank changes
CREATE TABLE IF NOT EXISTS leaderboard_history (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    timeframe VARCHAR(50) DEFAULT 'all_time',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard snapshots for animations
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updates_count INTEGER DEFAULT 0,
    biggest_mover JSONB,
    data JSONB
);

-- User activities for recent activity tracking
CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    points INTEGER DEFAULT 0,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Celebrations table for tracking special events
CREATE TABLE IF NOT EXISTS celebrations (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    celebration_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    visual_effects JSONB,
    duration INTEGER DEFAULT 3000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress tracking tables
CREATE TABLE IF NOT EXISTS progress_snapshots (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_points INTEGER NOT NULL,
    level INTEGER NOT NULL,
    badges INTEGER NOT NULL,
    achievements INTEGER NOT NULL,
    streak INTEGER NOT NULL,
    weekly_progress INTEGER DEFAULT 0,
    monthly_progress INTEGER DEFAULT 0,
    skill_scores JSONB DEFAULT '[]'
);

-- Metrics snapshots for analytics
CREATE TABLE IF NOT EXISTS metrics_snapshots (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metrics_data JSONB NOT NULL
);

-- Team achievements table
CREATE TABLE IF NOT EXISTS team_achievements (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR(255) NOT NULL,
    achievement_id VARCHAR(255) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Collaborative achievements table
CREATE TABLE IF NOT EXISTS collaborative_achievements (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    required_members INTEGER DEFAULT 2,
    criteria JSONB NOT NULL,
    rewards JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_type ON user_streaks(streak_type);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_user_id ON streak_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_user_id ON leaderboard_history(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_created_at ON leaderboard_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_celebrations_user_id ON celebrations(user_id);
CREATE INDEX IF NOT EXISTS idx_celebrations_created_at ON celebrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_user_id ON progress_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_timestamp ON progress_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_created_at ON metrics_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_achievements_team_id ON team_achievements(team_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_achievements_active ON collaborative_achievements(is_active);

-- Real-time updates table
CREATE TABLE IF NOT EXISTS real_time_updates (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    data JSONB NOT NULL,
    priority VARCHAR(20) NOT NULL,
    target_audience VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

-- WebSocket sessions table
CREATE TABLE IF NOT EXISTS websocket_sessions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rooms JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);

-- Collaboration sessions table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id VARCHAR(255) PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    participants JSONB NOT NULL,
    shared_state JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Live activity feed table
CREATE TABLE IF NOT EXISTS live_activity_feed (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    visibility VARCHAR(20) DEFAULT 'public'
);

-- Enhanced indexes for real-time features
CREATE INDEX IF NOT EXISTS idx_real_time_updates_type ON real_time_updates(type);
CREATE INDEX IF NOT EXISTS idx_real_time_updates_timestamp ON real_time_updates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_real_time_updates_processed ON real_time_updates(processed);
CREATE INDEX IF NOT EXISTS idx_real_time_updates_user_id ON real_time_updates(user_id);

CREATE INDEX IF NOT EXISTS idx_websocket_sessions_user_id ON websocket_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_sessions_active ON websocket_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_websocket_sessions_last_activity ON websocket_sessions(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_room_id ON collaboration_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_last_activity ON collaboration_sessions(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_live_activity_feed_user_id ON live_activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_live_activity_feed_timestamp ON live_activity_feed(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_live_activity_feed_type ON live_activity_feed(activity_type);

-- WebSocket performance monitoring tables
CREATE TABLE IF NOT EXISTS websocket_performance_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_connections INTEGER NOT NULL,
    active_connections INTEGER NOT NULL,
    authenticated_connections INTEGER NOT NULL,
    messages_per_second DECIMAL(10,2) NOT NULL,
    average_latency DECIMAL(10,2) NOT NULL,
    error_rate DECIMAL(5,2) NOT NULL,
    memory_usage DECIMAL(5,2) NOT NULL,
    cpu_usage DECIMAL(5,2) NOT NULL,
    metrics_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS websocket_performance_alerts (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metrics JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS websocket_connection_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS websocket_message_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,
    user_id VARCHAR(255),
    message_type VARCHAR(50) NOT NULL,
    message_size INTEGER NOT NULL,
    latency INTEGER,
    room_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_websocket_performance_metrics_timestamp ON websocket_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_websocket_performance_alerts_type ON websocket_performance_alerts(type);
CREATE INDEX IF NOT EXISTS idx_websocket_performance_alerts_severity ON websocket_performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_websocket_performance_alerts_resolved ON websocket_performance_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_websocket_connection_events_type ON websocket_connection_events(event_type);
CREATE INDEX IF NOT EXISTS idx_websocket_connection_events_timestamp ON websocket_connection_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_websocket_message_events_type ON websocket_message_events(event_type);
CREATE INDEX IF NOT EXISTS idx_websocket_message_events_timestamp ON websocket_message_events(timestamp DESC);

-- Insert default milestones
INSERT INTO milestones (id, name, description, type, threshold, points, badge_id) VALUES
('points-1000', '1K Points', 'Reach 1,000 total points', 'points', 1000, 100, NULL),
('points-5000', '5K Points', 'Reach 5,000 total points', 'points', 5000, 250, NULL),
('points-10000', '10K Points', 'Reach 10,000 total points', 'points', 10000, 500, NULL),
('level-10', 'Level 10', 'Reach level 10', 'level', 10, 200, NULL),
('level-25', 'Level 25', 'Reach level 25', 'level', 25, 500, NULL),
('submissions-50', '50 Submissions', 'Complete 50 submissions', 'submissions', 50, 300, NULL)
ON CONFLICT (id) DO NOTHING;