-- GitHub Integration Database Schema Migration

-- GitHub tokens storage (encrypted)
CREATE TABLE IF NOT EXISTS github_tokens (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL UNIQUE,
    encrypted_token TEXT NOT NULL,
    token_scope TEXT[], -- GitHub token scopes
    is_active BOOLEAN DEFAULT true,
    last_validated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitored repositories configuration
CREATE TABLE IF NOT EXISTS monitored_repositories (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    repository_name VARCHAR(255) NOT NULL,
    repository_owner VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, repository_url)
);

-- Student GitHub profile mappings
CREATE TABLE IF NOT EXISTS student_github_profiles (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL,
    github_username VARCHAR(255) NOT NULL,
    github_user_id VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(50), -- 'manual', 'oauth', 'email'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, teacher_id),
    UNIQUE(github_username, teacher_id)
);

-- Student PR submissions tracking
CREATE TABLE IF NOT EXISTS student_pr_submissions (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    github_username VARCHAR(255) NOT NULL,
    repository_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_id VARCHAR(255) NOT NULL, -- GitHub PR ID
    pr_title TEXT NOT NULL,
    pr_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    merged_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'closed', 'merged')),
    commit_count INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    lines_changed INTEGER GENERATED ALWAYS AS (lines_added + lines_deleted) STORED,
    files_changed INTEGER DEFAULT 0,
    review_comments INTEGER DEFAULT 0,
    is_draft BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pr_id, repository_url)
);

-- PR analysis and insights
CREATE TABLE IF NOT EXISTS pr_analysis_cache (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    repository_name VARCHAR(255) NOT NULL,
    analysis_period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    total_prs INTEGER NOT NULL DEFAULT 0,
    merged_prs INTEGER NOT NULL DEFAULT 0,
    closed_prs INTEGER NOT NULL DEFAULT 0,
    open_prs INTEGER NOT NULL DEFAULT 0,
    avg_pr_size DECIMAL(10,2) DEFAULT 0,
    avg_review_time INTEGER DEFAULT 0, -- in hours
    pr_frequency DECIMAL(5,2) DEFAULT 0, -- PRs per week
    last_pr_date TIMESTAMP WITH TIME ZONE,
    progress_score DECIMAL(5,2) DEFAULT 0,
    trend VARCHAR(20) CHECK (trend IN ('improving', 'stable', 'declining')),
    insights TEXT[],
    recommendations TEXT[],
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(student_id, repository_name, analysis_period)
);

-- GitHub API rate limit tracking
CREATE TABLE IF NOT EXISTS github_rate_limits (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    limit_type VARCHAR(50) NOT NULL, -- 'core', 'search', 'graphql'
    requests_remaining INTEGER NOT NULL,
    requests_limit INTEGER NOT NULL,
    reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GitHub webhook events log
CREATE TABLE IF NOT EXISTS github_webhook_events (
    id SERIAL PRIMARY KEY,
    repository_url VARCHAR(500) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    action VARCHAR(100),
    pr_number INTEGER,
    pr_id VARCHAR(255),
    sender_username VARCHAR(255),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student progress snapshots for GitHub activity
CREATE TABLE IF NOT EXISTS student_github_progress (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL,
    snapshot_date DATE NOT NULL,
    total_prs INTEGER NOT NULL DEFAULT 0,
    prs_this_week INTEGER NOT NULL DEFAULT 0,
    prs_this_month INTEGER NOT NULL DEFAULT 0,
    avg_prs_per_week DECIMAL(5,2) DEFAULT 0,
    last_pr_submission TIMESTAMP WITH TIME ZONE,
    progress_score DECIMAL(5,2) DEFAULT 0,
    activity_trend VARCHAR(20) CHECK (activity_trend IN ('increasing', 'stable', 'decreasing')),
    repositories_contributed TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, teacher_id, snapshot_date)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_github_tokens_teacher_id ON github_tokens(teacher_id);
CREATE INDEX IF NOT EXISTS idx_github_tokens_active ON github_tokens(is_active);

CREATE INDEX IF NOT EXISTS idx_monitored_repos_teacher_id ON monitored_repositories(teacher_id);
CREATE INDEX IF NOT EXISTS idx_monitored_repos_active ON monitored_repositories(is_active);
CREATE INDEX IF NOT EXISTS idx_monitored_repos_sync_status ON monitored_repositories(sync_status);

CREATE INDEX IF NOT EXISTS idx_student_github_profiles_student_teacher ON student_github_profiles(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_github_profiles_github_username ON student_github_profiles(github_username);
CREATE INDEX IF NOT EXISTS idx_student_github_profiles_verified ON student_github_profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_student_pr_submissions_student_id ON student_pr_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_pr_submissions_github_username ON student_pr_submissions(github_username);
CREATE INDEX IF NOT EXISTS idx_student_pr_submissions_repository ON student_pr_submissions(repository_name);
CREATE INDEX IF NOT EXISTS idx_student_pr_submissions_status ON student_pr_submissions(status);
CREATE INDEX IF NOT EXISTS idx_student_pr_submissions_created_at ON student_pr_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_pr_submissions_pr_id ON student_pr_submissions(pr_id);

CREATE INDEX IF NOT EXISTS idx_pr_analysis_cache_student_repo ON pr_analysis_cache(student_id, repository_name);
CREATE INDEX IF NOT EXISTS idx_pr_analysis_cache_generated_at ON pr_analysis_cache(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_analysis_cache_valid_until ON pr_analysis_cache(valid_until);

CREATE INDEX IF NOT EXISTS idx_github_rate_limits_teacher_type ON github_rate_limits(teacher_id, limit_type);
CREATE INDEX IF NOT EXISTS idx_github_rate_limits_reset_time ON github_rate_limits(reset_time);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_repository ON github_webhook_events(repository_url);
CREATE INDEX IF NOT EXISTS idx_github_webhook_events_processed ON github_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_github_webhook_events_received_at ON github_webhook_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_github_progress_student_teacher ON student_github_progress(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_github_progress_snapshot_date ON student_github_progress(snapshot_date DESC);

-- Triggers for updating timestamps
CREATE TRIGGER update_github_tokens_updated_at 
    BEFORE UPDATE ON github_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitored_repositories_updated_at 
    BEFORE UPDATE ON monitored_repositories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_github_profiles_updated_at 
    BEFORE UPDATE ON student_github_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for GitHub analytics
CREATE OR REPLACE VIEW student_pr_summary AS
SELECT 
    sgp.student_id,
    sgp.github_username,
    sgp.teacher_id,
    COUNT(sps.id) as total_prs,
    COUNT(CASE WHEN sps.status = 'merged' THEN 1 END) as merged_prs,
    COUNT(CASE WHEN sps.status = 'open' THEN 1 END) as open_prs,
    COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
    COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month,
    MAX(sps.created_at) as last_pr_date,
    AVG(sps.lines_changed) as avg_pr_size,
    COUNT(DISTINCT sps.repository_name) as repositories_count
FROM student_github_profiles sgp
LEFT JOIN student_pr_submissions sps ON sgp.github_username = sps.github_username
WHERE sgp.is_verified = true
GROUP BY sgp.student_id, sgp.github_username, sgp.teacher_id;

CREATE OR REPLACE VIEW teacher_github_overview AS
SELECT 
    mr.teacher_id,
    COUNT(DISTINCT mr.id) as monitored_repositories,
    COUNT(DISTINCT sgp.student_id) as mapped_students,
    COUNT(DISTINCT sps.id) as total_prs,
    COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
    MAX(mr.last_sync) as last_sync_time,
    COUNT(CASE WHEN mr.sync_status = 'error' THEN 1 END) as sync_errors
FROM monitored_repositories mr
LEFT JOIN student_github_profiles sgp ON mr.teacher_id = sgp.teacher_id
LEFT JOIN student_pr_submissions sps ON sgp.github_username = sps.github_username 
    AND sps.repository_name = mr.repository_name
WHERE mr.is_active = true
GROUP BY mr.teacher_id;

CREATE OR REPLACE VIEW repository_activity_summary AS
SELECT 
    mr.repository_name,
    mr.teacher_id,
    COUNT(DISTINCT sps.github_username) as active_contributors,
    COUNT(sps.id) as total_prs,
    COUNT(CASE WHEN sps.status = 'merged' THEN 1 END) as merged_prs,
    COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
    AVG(sps.lines_changed) as avg_pr_size,
    MAX(sps.created_at) as last_activity
FROM monitored_repositories mr
LEFT JOIN student_pr_submissions sps ON mr.repository_name = sps.repository_name
WHERE mr.is_active = true
GROUP BY mr.repository_name, mr.teacher_id;

-- Functions for GitHub analytics
CREATE OR REPLACE FUNCTION calculate_student_pr_trend(
    p_student_id VARCHAR(255),
    p_days INTEGER DEFAULT 30
) RETURNS VARCHAR(20) AS $$
DECLARE
    recent_count INTEGER;
    previous_count INTEGER;
    trend VARCHAR(20);
BEGIN
    -- Count PRs in recent period
    SELECT COUNT(*) INTO recent_count
    FROM student_pr_submissions sps
    JOIN student_github_profiles sgp ON sps.github_username = sgp.github_username
    WHERE sgp.student_id = p_student_id
    AND sps.created_at >= NOW() - INTERVAL '1 day' * p_days;
    
    -- Count PRs in previous period
    SELECT COUNT(*) INTO previous_count
    FROM student_pr_submissions sps
    JOIN student_github_profiles sgp ON sps.github_username = sgp.github_username
    WHERE sgp.student_id = p_student_id
    AND sps.created_at >= NOW() - INTERVAL '1 day' * (p_days * 2)
    AND sps.created_at < NOW() - INTERVAL '1 day' * p_days;
    
    -- Determine trend
    IF recent_count > previous_count THEN
        trend := 'improving';
    ELSIF recent_count < previous_count THEN
        trend := 'declining';
    ELSE
        trend := 'stable';
    END IF;
    
    RETURN trend;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_student_pr_stats(
    p_student_id VARCHAR(255),
    p_teacher_id VARCHAR(255)
) RETURNS TABLE (
    total_prs INTEGER,
    merged_prs INTEGER,
    open_prs INTEGER,
    prs_this_week INTEGER,
    prs_this_month INTEGER,
    last_pr_date TIMESTAMP WITH TIME ZONE,
    avg_pr_size DECIMAL,
    trend VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(sps.id)::INTEGER, 0) as total_prs,
        COALESCE(COUNT(CASE WHEN sps.status = 'merged' THEN 1 END)::INTEGER, 0) as merged_prs,
        COALESCE(COUNT(CASE WHEN sps.status = 'open' THEN 1 END)::INTEGER, 0) as open_prs,
        COALESCE(COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::INTEGER, 0) as prs_this_week,
        COALESCE(COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::INTEGER, 0) as prs_this_month,
        MAX(sps.created_at) as last_pr_date,
        COALESCE(AVG(sps.lines_changed), 0) as avg_pr_size,
        calculate_student_pr_trend(p_student_id) as trend
    FROM student_github_profiles sgp
    LEFT JOIN student_pr_submissions sps ON sgp.github_username = sps.github_username
    WHERE sgp.student_id = p_student_id 
    AND sgp.teacher_id = p_teacher_id
    AND sgp.is_verified = true;
END;
$$ LANGUAGE plpgsql;