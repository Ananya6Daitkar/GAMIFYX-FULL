-- Competition Service Database Schema
-- Migration 001: Create competitions table

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Competitions table
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('hacktoberfest', 'github_game_off', 'gitlab_hackathon', 'custom_competition', 'open_source_challenge')),
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    
    -- Competition details
    organizer VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    
    -- Timing
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    
    -- External integration
    external_id VARCHAR(255),
    api_endpoint VARCHAR(500),
    webhook_url VARCHAR(500),
    
    -- Settings
    auto_validation BOOLEAN DEFAULT true,
    difficulty_level VARCHAR(20) DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    max_participants INTEGER,
    
    -- Tracking
    participant_count INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[], -- Array of tags
    categories TEXT[], -- Array of categories
    rules TEXT[], -- Array of rules
    eligibility_criteria TEXT[], -- Array of eligibility criteria
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= start_date)
);

-- Competition requirements table
CREATE TABLE competition_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pull_request', 'commit', 'repository', 'issue', 'review', 'custom')),
    description TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '{}',
    points INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN DEFAULT true,
    validation_script TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competition rewards table
CREATE TABLE competition_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('badge', 'points', 'certificate', 'swag', 'recognition')),
    criteria TEXT NOT NULL,
    value INTEGER,
    image_url VARCHAR(500),
    external_url VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competition badges table
CREATE TABLE competition_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    criteria TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation rules table
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('github_pr', 'gitlab_mr', 'commit_count', 'repository_stars', 'custom')),
    script TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    weight DECIMAL(3,2) DEFAULT 1.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_competitions_type ON competitions(type);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_start_date ON competitions(start_date);
CREATE INDEX idx_competitions_end_date ON competitions(end_date);
CREATE INDEX idx_competitions_created_by ON competitions(created_by);
CREATE INDEX idx_competitions_tags ON competitions USING GIN(tags);
CREATE INDEX idx_competitions_categories ON competitions USING GIN(categories);

CREATE INDEX idx_competition_requirements_competition_id ON competition_requirements(competition_id);
CREATE INDEX idx_competition_requirements_type ON competition_requirements(type);

CREATE INDEX idx_competition_rewards_competition_id ON competition_rewards(competition_id);
CREATE INDEX idx_competition_rewards_type ON competition_rewards(type);

CREATE INDEX idx_competition_badges_competition_id ON competition_badges(competition_id);
CREATE INDEX idx_competition_badges_rarity ON competition_badges(rarity);

CREATE INDEX idx_validation_rules_competition_id ON validation_rules(competition_id);
CREATE INDEX idx_validation_rules_type ON validation_rules(type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competition_requirements_updated_at BEFORE UPDATE ON competition_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competition_rewards_updated_at BEFORE UPDATE ON competition_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competition_badges_updated_at BEFORE UPDATE ON competition_badges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_validation_rules_updated_at BEFORE UPDATE ON validation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();