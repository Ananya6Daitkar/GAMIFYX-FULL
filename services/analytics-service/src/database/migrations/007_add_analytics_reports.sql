-- Migration: Add analytics reports table for GitHub integration
-- Version: 007
-- Description: Create table to store generated analytics reports

-- Create analytics reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    summary JSONB NOT NULL,
    details JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_reports_teacher_id ON analytics_reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_generated_at ON analytics_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_expires_at ON analytics_reports(expires_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_reports_teacher_type_date 
ON analytics_reports(teacher_id, report_type, generated_at DESC);

-- Add comments for documentation
COMMENT ON TABLE analytics_reports IS 'Stores generated analytics reports including GitHub PR metrics';
COMMENT ON COLUMN analytics_reports.id IS 'Unique identifier for the report';
COMMENT ON COLUMN analytics_reports.teacher_id IS 'ID of the teacher who requested the report';
COMMENT ON COLUMN analytics_reports.report_type IS 'Type of report (github_performance, class_analytics, etc.)';
COMMENT ON COLUMN analytics_reports.summary IS 'JSON summary of key metrics and insights';
COMMENT ON COLUMN analytics_reports.details IS 'JSON detailed report data';
COMMENT ON COLUMN analytics_reports.generated_at IS 'When the report was generated';
COMMENT ON COLUMN analytics_reports.expires_at IS 'When the report expires (optional)';
COMMENT ON COLUMN analytics_reports.is_archived IS 'Whether the report has been archived';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_analytics_reports_updated_at ON analytics_reports;
CREATE TRIGGER trigger_update_analytics_reports_updated_at
    BEFORE UPDATE ON analytics_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_reports_updated_at();

-- Add sample data for testing (optional)
INSERT INTO analytics_reports (
    id, 
    teacher_id, 
    report_type, 
    title,
    summary, 
    details
) VALUES (
    'sample_report_001',
    'teacher_001',
    'github_performance',
    'GitHub Performance Report - October 2024',
    '{"totalStudents": 25, "averagePerformanceScore": 75.5, "averagePRActivity": 8.2}',
    '{"students": [], "insights": ["Class shows good GitHub engagement"]}'
) ON CONFLICT (id) DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_reports TO analytics_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO analytics_service_user;