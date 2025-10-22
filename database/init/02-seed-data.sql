-- Seed data for AIOps Learning Platform

-- Insert default badges
INSERT INTO badges (name, description, icon_url, criteria, points_value) VALUES
('First Submission', 'Complete your first code submission', '/icons/first-submission.svg', '{"submissions_count": 1}', 10),
('Code Quality Champion', 'Achieve 90%+ code quality score', '/icons/quality-champion.svg', '{"code_quality_score": 90}', 50),
('Security Expert', 'Submit code with zero security vulnerabilities', '/icons/security-expert.svg', '{"security_vulnerabilities": 0}', 75),
('Speed Demon', 'Complete assignment in under 30 minutes', '/icons/speed-demon.svg', '{"completion_time_minutes": 30}', 25),
('Consistent Performer', 'Submit code for 7 consecutive days', '/icons/consistent-performer.svg', '{"consecutive_days": 7}', 100),
('Test Coverage Master', 'Achieve 95%+ test coverage', '/icons/test-coverage.svg', '{"test_coverage": 95}', 60),
('Leaderboard Leader', 'Reach top 3 in class leaderboard', '/icons/leaderboard-leader.svg', '{"leaderboard_position": 3}', 150),
('Improvement Star', 'Show 20% improvement in performance', '/icons/improvement-star.svg', '{"performance_improvement": 20}', 80);

-- Insert sample teacher user
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('teacher@aiops.edu', '$2b$10$example.hash.for.password123', 'Jane', 'Smith', 'teacher');

-- Insert sample student users
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('student1@aiops.edu', '$2b$10$example.hash.for.password123', 'John', 'Doe', 'student'),
('student2@aiops.edu', '$2b$10$example.hash.for.password123', 'Alice', 'Johnson', 'student'),
('student3@aiops.edu', '$2b$10$example.hash.for.password123', 'Bob', 'Wilson', 'student');

-- Insert user profiles for sample users
INSERT INTO user_profiles (user_id, github_username, bio, preferences) 
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'teacher@aiops.edu' THEN 'jane-smith-teacher'
        WHEN u.email = 'student1@aiops.edu' THEN 'Ananya6Daitkar'
        WHEN u.email = 'student2@aiops.edu' THEN 'alice-johnson-coder'
        WHEN u.email = 'student3@aiops.edu' THEN 'bob-wilson-programmer'
    END,
    CASE 
        WHEN u.role = 'teacher' THEN 'DevOps instructor with 10+ years experience'
        WHEN u.email = 'student1@aiops.edu' THEN 'Computer Science student passionate about DevOps and cloud technologies'
        ELSE 'Computer Science student learning DevOps practices'
    END,
    '{"notifications": true, "theme": "light", "dashboard_layout": "default"}'
FROM users u;

-- Insert sample submissions using real GitHub repositories
INSERT INTO submissions (user_id, title, description, repository_url, commit_hash, submission_type, status, metrics)
SELECT 
    u.id,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 1 THEN 'Docker Containerization Assignment'
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 2 THEN 'Kubernetes Deployment Project'
        ELSE 'CI/CD Pipeline Challenge'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 1 THEN 'Containerize a Node.js application with proper multi-stage builds'
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 2 THEN 'Deploy application to Kubernetes cluster with monitoring'
        ELSE 'Set up complete CI/CD pipeline with automated testing'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 1 THEN 'https://github.com/Ananya6Daitkar/docker-assignment'
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 2 THEN 'https://github.com/Ananya6Daitkar/k8s-deployment'
        ELSE 'https://github.com/Ananya6Daitkar/cicd-pipeline'
    END,
    'main',
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 1 THEN 'assignment'
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 2 THEN 'project'
        ELSE 'challenge'
    END,
    'completed',
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 1 THEN '{"lines_of_code": 150, "complexity": 3.2, "test_coverage": 85, "security_vulnerabilities": 0}'
        WHEN ROW_NUMBER() OVER (ORDER BY u.id) = 2 THEN '{"lines_of_code": 450, "complexity": 5.8, "test_coverage": 92, "security_vulnerabilities": 1}'
        ELSE '{"lines_of_code": 280, "complexity": 4.1, "test_coverage": 78, "security_vulnerabilities": 0}'
    END
FROM users u 
WHERE u.role = 'student' 
LIMIT 3;

-- Insert sample performance data
INSERT INTO student_performance (user_id, submission_id, code_quality_score, completion_time, test_coverage, security_score, risk_score, skill_tags, engagement_score)
SELECT 
    s.user_id,
    s.id,
    85.5,
    45,
    85.0,
    95.0,
    0.2,
    ARRAY['docker', 'nodejs', 'containerization'],
    78.5
FROM submissions s
WHERE s.status = 'completed';

-- Award some badges to students
INSERT INTO user_badges (user_id, badge_id)
SELECT 
    u.id,
    b.id
FROM users u
CROSS JOIN badges b
WHERE u.role = 'student' 
AND b.name IN ('First Submission', 'Code Quality Champion')
LIMIT 4;

-- Insert sample points
INSERT INTO user_points (user_id, points, source, description)
SELECT 
    ub.user_id,
    b.points_value,
    'badge_earned',
    'Earned badge: ' || b.name
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id;-- Enhanc
ed GamifyX seed data

-- Insert achievements (more comprehensive than badges)
INSERT INTO achievements (title, description, icon, rarity, category, criteria, points_value, max_progress) VALUES
('Quick Fix Hero', 'Resolve 10 incidents in under 5 minutes', '⚡', 'epic', 'performance', '{"incidents_resolved": 10, "max_resolution_time": 300}', 200, 10),
('Uptime Streak', 'Maintain 99.9% uptime for 30 days', '🔥', 'legendary', 'reliability', '{"uptime_percentage": 99.9, "duration_days": 30}', 500, 30),
('Security Guardian', 'Prevent 5 security incidents through proactive monitoring', '🛡️', 'rare', 'security', '{"security_incidents_prevented": 5}', 150, 5),
('Performance Optimizer', 'Improve system performance by 25%', '🚀', 'epic', 'optimization', '{"performance_improvement": 25}', 300, 1),
('Code Quality Master', 'Maintain 95%+ code quality for 20 submissions', '💎', 'rare', 'quality', '{"code_quality_avg": 95, "submissions_count": 20}', 250, 20),
('Team Player', 'Complete 10 team challenges successfully', '🤝', 'common', 'collaboration', '{"team_challenges_completed": 10}', 100, 10),
('Innovation Pioneer', 'Implement 3 innovative solutions', '💡', 'legendary', 'innovation', '{"innovative_solutions": 3}', 400, 3),
('Mentor Master', 'Help 15 team members improve their performance', '🎓', 'epic', 'mentorship', '{"members_helped": 15}', 350, 15),
('Automation Ace', 'Automate 10 manual processes', '🤖', 'rare', 'automation', '{"processes_automated": 10}', 200, 10),
('Monitoring Maestro', 'Set up comprehensive monitoring for 5 services', '📊', 'epic', 'monitoring', '{"services_monitored": 5}', 275, 5);

-- Insert user achievements for sample users with progress
INSERT INTO user_achievements (user_id, achievement_id, progress, max_progress, unlocked, unlocked_at)
SELECT 
    u.id,
    a.id,
    CASE 
        WHEN a.title = 'Quick Fix Hero' THEN 8
        WHEN a.title = 'Uptime Streak' THEN 25
        WHEN a.title = 'Security Guardian' THEN 5
        WHEN a.title = 'Code Quality Master' THEN 15
        ELSE FLOOR(RANDOM() * a.max_progress)
    END,
    a.max_progress,
    CASE 
        WHEN a.title = 'Security Guardian' THEN true
        WHEN a.title = 'Team Player' AND u.email = 'student1@aiops.edu' THEN true
        ELSE false
    END,
    CASE 
        WHEN a.title = 'Security Guardian' THEN CURRENT_TIMESTAMP - INTERVAL '2 days'
        WHEN a.title = 'Team Player' AND u.email = 'student1@aiops.edu' THEN CURRENT_TIMESTAMP - INTERVAL '1 day'
        ELSE NULL
    END
FROM users u
CROSS JOIN achievements a
WHERE u.role = 'student'
AND a.title IN ('Quick Fix Hero', 'Uptime Streak', 'Security Guardian', 'Code Quality Master', 'Team Player');

-- Create sample teams
INSERT INTO teams (name, description, created_by, max_members) 
SELECT 
    'DevOps Champions',
    'Elite team focused on DevOps excellence and innovation',
    u.id,
    5
FROM users u 
WHERE u.email = 'student1@aiops.edu'
UNION ALL
SELECT 
    'Cloud Architects',
    'Team specializing in cloud infrastructure and scalability',
    u.id,
    6
FROM users u 
WHERE u.email = 'student2@aiops.edu';

-- Add team members
INSERT INTO team_members (team_id, user_id, role)
SELECT 
    t.id,
    u.id,
    CASE 
        WHEN u.id = t.created_by THEN 'leader'
        ELSE 'member'
    END
FROM teams t
CROSS JOIN users u
WHERE u.role = 'student'
AND (
    (t.name = 'DevOps Champions' AND u.email IN ('student1@aiops.edu', 'student2@aiops.edu'))
    OR (t.name = 'Cloud Architects' AND u.email IN ('student2@aiops.edu', 'student3@aiops.edu'))
);

-- Create leaderboards
INSERT INTO leaderboards (name, description, timeframe, category) VALUES
('Weekly Champions', 'Top performers this week', 'weekly', 'overall'),
('Monthly Masters', 'Best of the month', 'monthly', 'overall'),
('All-Time Legends', 'Hall of fame', 'all_time', 'overall'),
('Security Specialists', 'Security-focused leaderboard', 'monthly', 'security'),
('Performance Pros', 'Performance optimization leaders', 'weekly', 'performance');

-- Insert leaderboard entries
INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score, period_start, period_end)
SELECT 
    l.id,
    u.id,
    ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY RANDOM()),
    FLOOR(RANDOM() * 1000) + 500,
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE
FROM leaderboards l
CROSS JOIN users u
WHERE u.role = 'student'
AND l.timeframe = 'weekly';

-- Initialize user streaks
INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
SELECT 
    u.id,
    'daily_login',
    FLOOR(RANDOM() * 15) + 1,
    FLOOR(RANDOM() * 30) + 5,
    CURRENT_DATE
FROM users u
WHERE u.role = 'student'
UNION ALL
SELECT 
    u.id,
    'submission',
    FLOOR(RANDOM() * 10) + 1,
    FLOOR(RANDOM() * 20) + 3,
    CURRENT_DATE - INTERVAL '1 day'
FROM users u
WHERE u.role = 'student';

-- Create sample challenges
INSERT INTO challenges (title, description, challenge_type, difficulty, start_date, end_date, max_participants, reward_points, criteria, created_by)
SELECT 
    'DevOps Mastery Challenge',
    'Complete a full DevOps pipeline with monitoring, security, and automation',
    'individual',
    'advanced',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    50,
    1000,
    '{"required_tasks": ["ci_cd_setup", "monitoring_implementation", "security_scanning", "automation_scripts"], "min_score": 80}',
    u.id
FROM users u 
WHERE u.role = 'teacher'
LIMIT 1
UNION ALL
SELECT 
    'Team Collaboration Sprint',
    'Work together to build and deploy a microservices application',
    'team',
    'intermediate',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '21 days',
    20,
    1500,
    '{"team_size": {"min": 3, "max": 5}, "deliverables": ["architecture_design", "implementation", "deployment", "documentation"]}',
    u.id
FROM users u 
WHERE u.role = 'teacher'
LIMIT 1;

-- Add challenge participations
INSERT INTO challenge_participations (challenge_id, user_id, team_id, status, progress, score)
SELECT 
    c.id,
    u.id,
    CASE WHEN c.challenge_type = 'team' THEN t.id ELSE NULL END,
    'active',
    '{"tasks_completed": 2, "current_task": "monitoring_implementation"}',
    FLOOR(RANDOM() * 60) + 20
FROM challenges c
CROSS JOIN users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.role = 'student'
AND (c.challenge_type = 'individual' OR (c.challenge_type = 'team' AND t.id IS NOT NULL))
LIMIT 6;

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, priority, is_read)
SELECT 
    u.id,
    'achievement',
    'Achievement Unlocked!',
    'Congratulations! You''ve unlocked the "Security Guardian" achievement.',
    'high',
    false
FROM users u
WHERE u.role = 'student'
AND u.email = 'student1@aiops.edu'
UNION ALL
SELECT 
    u.id,
    'system',
    'New Challenge Available',
    'A new DevOps Mastery Challenge has been posted. Join now!',
    'medium',
    false
FROM users u
WHERE u.role = 'student'
UNION ALL
SELECT 
    u.id,
    'team',
    'Team Update',
    'Your team "DevOps Champions" has moved up in the leaderboard!',
    'medium',
    true
FROM users u
JOIN team_members tm ON u.id = tm.user_id
JOIN teams t ON tm.team_id = t.id
WHERE t.name = 'DevOps Champions';

-- Insert sample system metrics
INSERT INTO system_metrics (metric_name, metric_value, metric_unit, service_name, timestamp, metadata)
VALUES
('cpu_usage', 68.5, 'percent', 'api-gateway', CURRENT_TIMESTAMP - INTERVAL '5 minutes', '{"host": "gateway-01"}'),
('memory_usage', 72.3, 'percent', 'api-gateway', CURRENT_TIMESTAMP - INTERVAL '5 minutes', '{"host": "gateway-01"}'),
('response_time', 245.7, 'milliseconds', 'user-service', CURRENT_TIMESTAMP - INTERVAL '3 minutes', '{"endpoint": "/api/users"}'),
('error_rate', 0.12, 'percent', 'gamification-service', CURRENT_TIMESTAMP - INTERVAL '2 minutes', '{"endpoint": "/api/leaderboard"}'),
('throughput', 1247.8, 'requests_per_second', 'api-gateway', CURRENT_TIMESTAMP - INTERVAL '1 minute', '{"load_balancer": "nginx"}'),
('disk_usage', 45.2, 'percent', 'database', CURRENT_TIMESTAMP - INTERVAL '10 minutes', '{"mount": "/var/lib/postgresql"}'),
('network_io', 156.4, 'mbps', 'api-gateway', CURRENT_TIMESTAMP - INTERVAL '4 minutes', '{"interface": "eth0"}'),
('active_connections', 342, 'count', 'database', CURRENT_TIMESTAMP - INTERVAL '6 minutes', '{"pool": "primary"}');

-- Insert sample AI insights
INSERT INTO ai_insights (insight_type, title, message, confidence, severity, affected_systems, metadata)
VALUES
('anomaly', 'Unusual Traffic Pattern Detected', 'API Gateway is experiencing 40% higher than normal traffic from specific geographic regions', 89.5, 'warning', ARRAY['api-gateway', 'load-balancer'], '{"regions": ["us-west", "eu-central"], "increase_percentage": 40}'),
('prediction', 'Database Connection Pool Capacity Warning', 'Current trends suggest database connection pool may reach capacity within 2 hours', 94.2, 'error', ARRAY['database', 'user-service', 'gamification-service'], '{"estimated_time_to_capacity": "2 hours", "current_utilization": 78}'),
('optimization', 'Memory Optimization Opportunity', 'Gamification service shows memory usage patterns that could be optimized through caching improvements', 76.8, 'info', ARRAY['gamification-service'], '{"potential_savings": "25%", "optimization_type": "caching"}'),
('recommendation', 'Auto-scaling Recommendation', 'Consider enabling auto-scaling for user-service based on current load patterns', 82.3, 'info', ARRAY['user-service'], '{"recommended_min_instances": 2, "recommended_max_instances": 8}');

-- Insert sample incidents
INSERT INTO incidents (title, description, severity, status, confidence, predicted_at, affected_systems, ai_prediction, metadata)
VALUES
('High Memory Usage Predicted', 'AI model predicts memory usage will exceed 90% threshold in gamification service', 'medium', 'predicted', 87.4, CURRENT_TIMESTAMP - INTERVAL '15 minutes', ARRAY['gamification-service'], true, '{"predicted_threshold_breach": "90%", "current_usage": "72%"}'),
('Database Performance Degradation', 'Potential database bottleneck detected based on query response time trends', 'high', 'predicted', 92.1, CURRENT_TIMESTAMP - INTERVAL '8 minutes', ARRAY['database', 'analytics-service'], true, '{"avg_response_time_increase": "35%", "affected_queries": ["leaderboard", "user_stats"]}'),
('Network Latency Spike', 'Unusual network latency detected between services', 'low', 'resolved', 65.8, CURRENT_TIMESTAMP - INTERVAL '2 hours', ARRAY['api-gateway', 'user-service'], true, '{"resolution": "auto-resolved", "duration_minutes": 12}');

-- Insert user dashboard preferences
INSERT INTO user_dashboard_preferences (user_id, theme, layout, notifications_enabled, animations_enabled, particles_enabled, dashboard_widgets)
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'student1@aiops.edu' THEN 'cyberpunk'
        WHEN u.email = 'student2@aiops.edu' THEN 'dark'
        ELSE 'cyberpunk'
    END,
    'default',
    true,
    true,
    CASE 
        WHEN u.email = 'student3@aiops.edu' THEN false
        ELSE true
    END,
    '{"widgets": ["system_health", "leaderboard", "achievements", "metrics"], "layout_order": [1, 2, 3, 4]}'
FROM users u
WHERE u.role = 'student';

-- Update user points based on achievements and activities
INSERT INTO user_points (user_id, points, source, description)
SELECT 
    ua.user_id,
    a.points_value,
    'achievement_unlocked',
    'Achievement unlocked: ' || a.title
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.unlocked = true;

-- Add some additional points for various activities
INSERT INTO user_points (user_id, points, source, description)
SELECT 
    u.id,
    50,
    'daily_login',
    'Daily login bonus'
FROM users u
WHERE u.role = 'student'
UNION ALL
SELECT 
    u.id,
    25,
    'team_participation',
    'Active team participation'
FROM users u
JOIN team_members tm ON u.id = tm.user_id
WHERE u.role = 'student';