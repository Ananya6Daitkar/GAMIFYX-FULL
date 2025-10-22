-- GamifyX Database Optimization Script
-- Run this script to optimize database performance for the GamifyX platform

-- Create materialized views for frequently accessed data

-- Leaderboard materialized view for fast access
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_current_leaderboard AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    up.avatar_url,
    COALESCE(SUM(points.points), 0) as total_points,
    COUNT(DISTINCT ub.badge_id) as badge_count,
    COUNT(DISTINCT ua.achievement_id) FILTER (WHERE ua.unlocked = true) as achievement_count,
    COALESCE(MAX(us.current_streak), 0) as max_streak,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(points.points), 0) DESC) as rank
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_points points ON u.id = points.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN user_streaks us ON u.id = us.user_id
WHERE u.role = 'student' AND u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.email, up.avatar_url;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_user_id ON mv_current_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_rank ON mv_current_leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_points ON mv_current_leaderboard(total_points DESC);

-- User performance summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_performance_summary AS
SELECT 
    sp.user_id,
    COUNT(*) as total_submissions,
    AVG(sp.code_quality_score) as avg_code_quality,
    AVG(sp.completion_time) as avg_completion_time,
    AVG(sp.test_coverage) as avg_test_coverage,
    AVG(sp.security_score) as avg_security_score,
    AVG(sp.risk_score) as avg_risk_score,
    AVG(sp.engagement_score) as avg_engagement_score,
    MAX(sp.timestamp) as last_submission_date,
    ARRAY_AGG(DISTINCT unnest(sp.skill_tags)) as all_skills
FROM student_performance sp
GROUP BY sp.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_performance_user_id ON mv_user_performance_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_performance_quality ON mv_user_performance_summary(avg_code_quality DESC);
CREATE INDEX IF NOT EXISTS idx_mv_performance_risk ON mv_user_performance_summary(avg_risk_score);

-- Team performance materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_team_performance AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    COUNT(tm.user_id) as member_count,
    AVG(ups.avg_code_quality) as team_avg_quality,
    SUM(points.total_points) as team_total_points,
    COUNT(DISTINCT ub.badge_id) as team_badge_count,
    MAX(ups.last_submission_date) as last_team_activity
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN mv_user_performance_summary ups ON tm.user_id = ups.user_id
LEFT JOIN (
    SELECT user_id, SUM(points) as total_points 
    FROM user_points 
    GROUP BY user_id
) points ON tm.user_id = points.user_id
LEFT JOIN user_badges ub ON tm.user_id = ub.user_id
WHERE t.is_active = true
GROUP BY t.id, t.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_team_performance_id ON mv_team_performance(team_id);
CREATE INDEX IF NOT EXISTS idx_mv_team_performance_points ON mv_team_performance(team_total_points DESC);

-- System metrics summary for dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_system_health_summary AS
SELECT 
    service_name,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    STDDEV(metric_value) as stddev_value,
    COUNT(*) as data_points,
    MAX(timestamp) as last_updated
FROM system_metrics 
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY service_name, metric_name;

CREATE INDEX IF NOT EXISTS idx_mv_system_health_service ON mv_system_health_summary(service_name);
CREATE INDEX IF NOT EXISTS idx_mv_system_health_metric ON mv_system_health_summary(metric_name);

-- Functions for automatic materialized view refresh

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh performance summary
CREATE OR REPLACE FUNCTION refresh_performance_summary_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_performance;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh system health
CREATE OR REPLACE FUNCTION refresh_system_health_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_system_health_summary;
END;
$$ LANGUAGE plpgsql;

-- Partitioning for large tables

-- Partition system_metrics by date for better performance
CREATE TABLE IF NOT EXISTS system_metrics_y2025m10 PARTITION OF system_metrics
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS system_metrics_y2025m11 PARTITION OF system_metrics
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS system_metrics_y2025m12 PARTITION OF system_metrics
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Partition notifications by date
CREATE TABLE IF NOT EXISTS notifications_y2025m10 PARTITION OF notifications
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS notifications_y2025m11 PARTITION OF notifications
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Additional performance indexes

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON user_achievements(user_id, unlocked, progress);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service_time ON system_metrics(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity ON incidents(status, severity, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type_severity ON ai_insights(insight_type, severity, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_active_challenges ON challenges(start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_unread_notifications ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements ON user_achievements(user_id, unlocked_at DESC) WHERE unlocked = true;
CREATE INDEX IF NOT EXISTS idx_active_incidents ON incidents(predicted_at DESC, severity) WHERE status IN ('predicted', 'active');

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_achievements_criteria_gin ON achievements USING GIN (criteria);
CREATE INDEX IF NOT EXISTS idx_challenges_criteria_gin ON challenges USING GIN (criteria);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metadata_gin ON system_metrics USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_ai_insights_metadata_gin ON ai_insights USING GIN (metadata);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_achievements_search ON achievements USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_challenges_search ON challenges USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_notifications_search ON notifications USING GIN (to_tsvector('english', title || ' ' || message));

-- Database statistics and maintenance

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_gamifyx_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE users;
    ANALYZE user_achievements;
    ANALYZE user_points;
    ANALYZE teams;
    ANALYZE team_members;
    ANALYZE leaderboard_entries;
    ANALYZE system_metrics;
    ANALYZE notifications;
    ANALYZE ai_insights;
    ANALYZE incidents;
END;
$$ LANGUAGE plpgsql;

-- Function for database maintenance
CREATE OR REPLACE FUNCTION gamifyx_maintenance()
RETURNS void AS $$
BEGIN
    -- Update statistics
    PERFORM update_gamifyx_statistics();
    
    -- Refresh materialized views
    PERFORM refresh_leaderboard_mv();
    PERFORM refresh_performance_summary_mv();
    PERFORM refresh_system_health_mv();
    
    -- Clean up old data
    DELETE FROM system_metrics WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
    DELETE FROM notifications WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days' AND is_read = true;
    DELETE FROM ai_insights WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '60 days' AND is_resolved = true;
    
    -- Vacuum and reindex critical tables
    VACUUM ANALYZE user_points;
    VACUUM ANALYZE system_metrics;
    VACUUM ANALYZE notifications;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring views

-- View for slow queries identification
CREATE OR REPLACE VIEW v_performance_issues AS
SELECT 
    'slow_queries' as issue_type,
    'Database performance may be degraded' as description,
    COUNT(*) as count
FROM pg_stat_statements 
WHERE mean_exec_time > 1000  -- queries taking more than 1 second
UNION ALL
SELECT 
    'high_risk_users' as issue_type,
    'Users with high risk scores need attention' as description,
    COUNT(*)
FROM mv_user_performance_summary 
WHERE avg_risk_score > 0.7
UNION ALL
SELECT 
    'inactive_teams' as issue_type,
    'Teams with no recent activity' as description,
    COUNT(*)
FROM mv_team_performance 
WHERE last_team_activity < CURRENT_TIMESTAMP - INTERVAL '7 days';

-- View for system health dashboard
CREATE OR REPLACE VIEW v_system_health_dashboard AS
SELECT 
    service_name,
    metric_name,
    avg_value,
    CASE 
        WHEN metric_name = 'cpu_usage' AND avg_value > 80 THEN 'critical'
        WHEN metric_name = 'cpu_usage' AND avg_value > 60 THEN 'warning'
        WHEN metric_name = 'memory_usage' AND avg_value > 85 THEN 'critical'
        WHEN metric_name = 'memory_usage' AND avg_value > 70 THEN 'warning'
        WHEN metric_name = 'response_time' AND avg_value > 1000 THEN 'critical'
        WHEN metric_name = 'response_time' AND avg_value > 500 THEN 'warning'
        WHEN metric_name = 'error_rate' AND avg_value > 5 THEN 'critical'
        WHEN metric_name = 'error_rate' AND avg_value > 1 THEN 'warning'
        ELSE 'good'
    END as status,
    last_updated
FROM mv_system_health_summary
ORDER BY 
    CASE 
        WHEN metric_name = 'cpu_usage' AND avg_value > 80 THEN 1
        WHEN metric_name = 'memory_usage' AND avg_value > 85 THEN 1
        WHEN metric_name = 'response_time' AND avg_value > 1000 THEN 1
        WHEN metric_name = 'error_rate' AND avg_value > 5 THEN 1
        ELSE 2
    END,
    service_name;

-- Initial refresh of materialized views
SELECT refresh_leaderboard_mv();
SELECT refresh_performance_summary_mv();
SELECT refresh_system_health_mv();

-- Update statistics
SELECT update_gamifyx_statistics();

COMMIT;