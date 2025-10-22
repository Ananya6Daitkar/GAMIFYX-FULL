-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create secret access logs table
CREATE TABLE IF NOT EXISTS secret_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_id VARCHAR(255) NOT NULL,
    secret_path VARCHAR(500) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'rotate', 'list')),
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure')),
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rotation jobs table
CREATE TABLE IF NOT EXISTS rotation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_id VARCHAR(255) NOT NULL,
    secret_path VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create secret usage tracking table
CREATE TABLE IF NOT EXISTS secret_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_id VARCHAR(255) NOT NULL,
    secret_path VARCHAR(500) NOT NULL,
    service VARCHAR(100),
    environment VARCHAR(50),
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(secret_path, service, environment)
);

-- Create CI/CD access logs table
CREATE TABLE IF NOT EXISTS cicd_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    secrets_requested INTEGER DEFAULT 0,
    secrets_provided INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_id VARCHAR(255),
    secret_path VARCHAR(500),
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('rotation_warning', 'rotation_success', 'rotation_failure', 'security_alert')),
    message TEXT NOT NULL,
    recipients TEXT[] NOT NULL,
    channels TEXT[] NOT NULL, -- ['slack', 'email', 'webhook']
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    secret_path VARCHAR(500),
    user_id VARCHAR(255),
    ip_address INET,
    metadata JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_secret_access_logs_secret_path ON secret_access_logs(secret_path);
CREATE INDEX IF NOT EXISTS idx_secret_access_logs_user_id ON secret_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_secret_access_logs_timestamp ON secret_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_secret_access_logs_action ON secret_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_secret_access_logs_result ON secret_access_logs(result);

CREATE INDEX IF NOT EXISTS idx_rotation_jobs_secret_path ON rotation_jobs(secret_path);
CREATE INDEX IF NOT EXISTS idx_rotation_jobs_status ON rotation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_rotation_jobs_scheduled_at ON rotation_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_rotation_jobs_next_retry_at ON rotation_jobs(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_secret_usage_secret_path ON secret_usage(secret_path);
CREATE INDEX IF NOT EXISTS idx_secret_usage_service_env ON secret_usage(service, environment);
CREATE INDEX IF NOT EXISTS idx_secret_usage_last_accessed ON secret_usage(last_accessed);

CREATE INDEX IF NOT EXISTS idx_cicd_access_logs_platform ON cicd_access_logs(platform);
CREATE INDEX IF NOT EXISTS idx_cicd_access_logs_environment ON cicd_access_logs(environment);
CREATE INDEX IF NOT EXISTS idx_cicd_access_logs_timestamp ON cicd_access_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_notification_logs_secret_path ON notification_logs(secret_path);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_secret_path ON security_alerts(secret_path);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_rotation_jobs_updated_at 
    BEFORE UPDATE ON rotation_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secret_usage_updated_at 
    BEFORE UPDATE ON secret_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create partitioning for large tables (optional, for high-volume environments)
-- Partition secret_access_logs by month
-- CREATE TABLE secret_access_logs_y2024m01 PARTITION OF secret_access_logs
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Add comments for documentation
COMMENT ON TABLE secret_access_logs IS 'Audit log for all secret access attempts';
COMMENT ON TABLE rotation_jobs IS 'Tracking table for secret rotation jobs';
COMMENT ON TABLE secret_usage IS 'Usage statistics and tracking for secrets';
COMMENT ON TABLE cicd_access_logs IS 'Access logs for CI/CD pipeline secret requests';
COMMENT ON TABLE notification_logs IS 'Log of all notifications sent by the system';
COMMENT ON TABLE security_alerts IS 'Security alerts and incidents related to secrets';

-- Insert initial data for testing (optional)
-- INSERT INTO secret_usage (secret_path, service, environment, access_count) VALUES
-- ('database/production/main', 'user-service', 'production', 0),
-- ('api-keys/github', 'ci-cd', 'production', 0),
-- ('jwt/signing-key', 'auth-service', 'production', 0);

-- Create views for common queries
CREATE OR REPLACE VIEW secret_access_summary AS
SELECT 
    secret_path,
    COUNT(*) as total_access,
    COUNT(CASE WHEN result = 'success' THEN 1 END) as successful_access,
    COUNT(CASE WHEN result = 'failure' THEN 1 END) as failed_access,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(timestamp) as last_accessed
FROM secret_access_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY secret_path;

CREATE OR REPLACE VIEW rotation_job_summary AS
SELECT 
    secret_path,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_jobs,
    MAX(completed_at) as last_rotation
FROM rotation_jobs
GROUP BY secret_path;

CREATE OR REPLACE VIEW security_alert_summary AS
SELECT 
    alert_type,
    severity,
    COUNT(*) as alert_count,
    COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_count,
    COUNT(CASE WHEN resolved = false THEN 1 END) as open_count,
    MAX(created_at) as latest_alert
FROM security_alerts
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY alert_type, severity
ORDER BY severity DESC, alert_count DESC;