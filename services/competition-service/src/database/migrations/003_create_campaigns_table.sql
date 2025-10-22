-- Migration 003: Create campaigns and related tables

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
    
    -- Campaign ownership
    instructor_id UUID NOT NULL,
    class_id UUID,
    course_id UUID,
    
    -- Timing
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Participation management
    max_participants INTEGER,
    bonus_points INTEGER DEFAULT 0,
    
    -- Tracking and analytics
    participation_rate DECIMAL(5,2) DEFAULT 0.0,
    completion_rate DECIMAL(5,2) DEFAULT 0.0,
    average_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Notification settings
    notification_settings JSONB DEFAULT '{}',
    announcement_channels TEXT[],
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_campaign_dates CHECK (end_date > start_date),
    CONSTRAINT valid_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= start_date),
    CONSTRAINT valid_participation_rate CHECK (participation_rate >= 0 AND participation_rate <= 100),
    CONSTRAINT valid_completion_rate CHECK (completion_rate >= 0 AND completion_rate <= 100)
);

-- Campaign competitions junction table
CREATE TABLE campaign_competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, competition_id)
);

-- Campaign invitations table
CREATE TABLE campaign_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'expired')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(campaign_id, student_id)
);

-- Campaign participations table
CREATE TABLE campaign_participations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn', 'removed')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Progress tracking
    total_score INTEGER DEFAULT 0,
    bonus_score INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    
    UNIQUE(campaign_id, student_id),
    CONSTRAINT valid_campaign_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Campaign custom requirements table
CREATE TABLE campaign_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pull_request', 'commit', 'repository', 'issue', 'review', 'custom')),
    description TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '{}',
    points INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN DEFAULT true,
    validation_script TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign custom badges table
CREATE TABLE campaign_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    criteria TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign notifications table
CREATE TABLE campaign_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('registration_open', 'registration_reminder', 'competition_start', 'milestone_achieved', 'deadline_reminder', 'competition_end', 'results_available')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    recipients TEXT[], -- Array of user IDs or 'all'
    channels TEXT[], -- Array of notification channels
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign analytics table (for caching analytics data)
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Daily metrics
    new_participants INTEGER DEFAULT 0,
    active_participants INTEGER DEFAULT 0,
    submissions_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Cumulative metrics
    total_participants INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_instructor_id ON campaigns(instructor_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX idx_campaigns_class_id ON campaigns(class_id);
CREATE INDEX idx_campaigns_course_id ON campaigns(course_id);

CREATE INDEX idx_campaign_competitions_campaign_id ON campaign_competitions(campaign_id);
CREATE INDEX idx_campaign_competitions_competition_id ON campaign_competitions(competition_id);

CREATE INDEX idx_campaign_invitations_campaign_id ON campaign_invitations(campaign_id);
CREATE INDEX idx_campaign_invitations_student_id ON campaign_invitations(student_id);
CREATE INDEX idx_campaign_invitations_status ON campaign_invitations(status);

CREATE INDEX idx_campaign_participations_campaign_id ON campaign_participations(campaign_id);
CREATE INDEX idx_campaign_participations_student_id ON campaign_participations(student_id);
CREATE INDEX idx_campaign_participations_status ON campaign_participations(status);

CREATE INDEX idx_campaign_requirements_campaign_id ON campaign_requirements(campaign_id);
CREATE INDEX idx_campaign_badges_campaign_id ON campaign_badges(campaign_id);

CREATE INDEX idx_campaign_notifications_campaign_id ON campaign_notifications(campaign_id);
CREATE INDEX idx_campaign_notifications_type ON campaign_notifications(type);
CREATE INDEX idx_campaign_notifications_status ON campaign_notifications(status);
CREATE INDEX idx_campaign_notifications_scheduled_at ON campaign_notifications(scheduled_at);

CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_date ON campaign_analytics(date);

-- Create triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_requirements_updated_at BEFORE UPDATE ON campaign_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_badges_updated_at BEFORE UPDATE ON campaign_badges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();