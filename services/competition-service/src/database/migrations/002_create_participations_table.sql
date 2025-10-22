-- Migration 002: Create participations and related tables

-- Participations table
CREATE TABLE participations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'completed', 'disqualified', 'withdrawn')),
    
    -- Registration details
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_data JSONB DEFAULT '{}',
    
    -- External platform connections
    github_username VARCHAR(255),
    gitlab_username VARCHAR(255),
    
    -- Progress tracking
    total_score INTEGER DEFAULT 0,
    rank INTEGER,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(competition_id, user_id),
    CONSTRAINT valid_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- External profiles table
CREATE TABLE external_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('github', 'gitlab', 'bitbucket', 'custom')),
    username VARCHAR(255) NOT NULL,
    profile_url VARCHAR(500) NOT NULL,
    verified BOOLEAN DEFAULT false,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(participation_id, platform)
);

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES competition_requirements(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evidence table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pull_request', 'commit', 'issue', 'review', 'repository', 'screenshot', 'link')),
    url VARCHAR(500) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES competition_requirements(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pull_request', 'repository', 'project', 'documentation', 'other')),
    
    -- Submission details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    url VARCHAR(500) NOT NULL,
    repository_url VARCHAR(500),
    
    -- External references
    external_id VARCHAR(255),
    pull_request_number INTEGER,
    commit_sha VARCHAR(40),
    
    -- Validation
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'approved', 'rejected', 'needs_review')),
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 100,
    
    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= max_score)
);

-- Validation results table
CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES validation_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'pending')),
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 100,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_by VARCHAR(50) DEFAULT 'system' CHECK (validated_by IN ('system', 'manual') OR validated_by ~ '^[a-f0-9-]{36}$'),
    
    CONSTRAINT valid_validation_score CHECK (score >= 0 AND score <= max_score)
);

-- Review comments table
CREATE TABLE review_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL,
    comment TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('approval', 'request_changes', 'comment')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    criteria TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0.0,
    achieved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_milestone_progress CHECK (progress >= 0 AND progress <= 100)
);

-- Create indexes for better performance
CREATE INDEX idx_participations_competition_id ON participations(competition_id);
CREATE INDEX idx_participations_user_id ON participations(user_id);
CREATE INDEX idx_participations_status ON participations(status);
CREATE INDEX idx_participations_registered_at ON participations(registered_at);
CREATE INDEX idx_participations_github_username ON participations(github_username);
CREATE INDEX idx_participations_gitlab_username ON participations(gitlab_username);

CREATE INDEX idx_external_profiles_participation_id ON external_profiles(participation_id);
CREATE INDEX idx_external_profiles_platform ON external_profiles(platform);
CREATE INDEX idx_external_profiles_username ON external_profiles(username);

CREATE INDEX idx_achievements_participation_id ON achievements(participation_id);
CREATE INDEX idx_achievements_competition_id ON achievements(competition_id);
CREATE INDEX idx_achievements_requirement_id ON achievements(requirement_id);
CREATE INDEX idx_achievements_earned_at ON achievements(earned_at);

CREATE INDEX idx_evidence_achievement_id ON evidence(achievement_id);
CREATE INDEX idx_evidence_type ON evidence(type);

CREATE INDEX idx_submissions_participation_id ON submissions(participation_id);
CREATE INDEX idx_submissions_requirement_id ON submissions(requirement_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX idx_submissions_external_id ON submissions(external_id);

CREATE INDEX idx_validation_results_submission_id ON validation_results(submission_id);
CREATE INDEX idx_validation_results_rule_id ON validation_results(rule_id);
CREATE INDEX idx_validation_results_status ON validation_results(status);

CREATE INDEX idx_review_comments_submission_id ON review_comments(submission_id);
CREATE INDEX idx_review_comments_reviewer_id ON review_comments(reviewer_id);

CREATE INDEX idx_milestones_participation_id ON milestones(participation_id);

-- Create triggers for updated_at
CREATE TRIGGER update_participations_updated_at BEFORE UPDATE ON participations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();