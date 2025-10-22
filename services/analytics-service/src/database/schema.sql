-- Analytics Service Database Schema

-- Student performance data (time-series)
CREATE TABLE IF NOT EXISTS student_performance_data (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submission_id VARCHAR(255),
    code_quality_score DECIMAL(5,2) NOT NULL,
    completion_time INTEGER NOT NULL, -- in seconds
    test_coverage DECIMAL(5,2) DEFAULT 0,
    security_score DECIMAL(5,2) DEFAULT 0,
    feedback_implementation_rate DECIMAL(5,2) DEFAULT 0,
    skill_tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk scores
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    risk_score DECIMAL(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    factors JSONB NOT NULL,
    recommendations TEXT[],
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB
);

-- Alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    cooldown_minutes INTEGER DEFAULT 60,
    escalation_rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(255) PRIMARY KEY,
    rule_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id VARCHAR(255),
    cohort_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
    escalation_level INTEGER DEFAULT 0,
    notification_channels TEXT[],
    assigned_to VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
);

-- Performance trends
CREATE TABLE IF NOT EXISTS performance_trends (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    data_points JSONB NOT NULL,
    trend VARCHAR(20) NOT NULL CHECK (trend IN ('improving', 'declining', 'stable')),
    trend_strength DECIMAL(3,2) NOT NULL CHECK (trend_strength >= -1 AND trend_strength <= 1),
    prediction JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cohort analyses
CREATE TABLE IF NOT EXISTS cohort_analyses (
    id SERIAL PRIMARY KEY,
    cohort_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    student_count INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    risk_distribution JSONB NOT NULL,
    trends JSONB,
    recommendations TEXT[],
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health metrics (time-series)
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    golden_signals JSONB NOT NULL,
    service_metrics JSONB NOT NULL,
    alerts_summary JSONB NOT NULL,
    performance_summary JSONB NOT NULL
);

-- Analytics reports
CREATE TABLE IF NOT EXISTS analytics_reports (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    data JSONB NOT NULL,
    format VARCHAR(10) NOT NULL CHECK (format IN ('json', 'csv', 'pdf')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    variables TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert acknowledgments and actions
CREATE TABLE IF NOT EXISTS alert_actions (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    metadata JSONB,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_performance_user_timestamp ON student_performance_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_student_performance_timestamp ON student_performance_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_student_performance_submission ON student_performance_data(submission_id);

CREATE INDEX IF NOT EXISTS idx_risk_scores_user_calculated ON risk_scores(user_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_valid_until ON risk_scores(valid_until);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to);

CREATE INDEX IF NOT EXISTS idx_performance_trends_user_metric ON performance_trends(user_id, metric);
CREATE INDEX IF NOT EXISTS idx_performance_trends_calculated_at ON performance_trends(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cohort_analyses_cohort_calculated ON cohort_analyses(cohort_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_generated_at ON analytics_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_expires_at ON analytics_reports(expires_at);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default alert rules
INSERT INTO alert_rules (id, name, description, type, conditions, actions) VALUES
('high-risk-student', 'High Risk Student Alert', 'Alert when student risk score exceeds 0.7', 'high_risk_student', 
 '[{"metric": "risk_score", "operator": "gt", "threshold": 0.7, "timeWindow": "1h", "aggregation": "avg"}]',
 '[{"type": "notification", "target": "teachers", "template": "high_risk_alert"}]'),
('performance-decline', 'Performance Decline Alert', 'Alert when student performance shows declining trend', 'performance_decline',
 '[{"metric": "code_quality_trend", "operator": "lt", "threshold": -0.5, "timeWindow": "7d", "aggregation": "avg"}]',
 '[{"type": "notification", "target": "teachers", "template": "performance_decline_alert"}]'),
('system-health', 'System Health Alert', 'Alert when system error rate exceeds threshold', 'system_health',
 '[{"metric": "error_rate", "operator": "gt", "threshold": 0.05, "timeWindow": "5m", "aggregation": "avg"}]',
 '[{"type": "notification", "target": "admins", "template": "system_health_alert"}]')
ON CONFLICT (id) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (id, name, type, channel, subject, body, variables) VALUES
('high_risk_alert', 'High Risk Student Alert', 'high_risk_student', 'email', 
 'Student at Risk: {{student_name}}', 
 'Student {{student_name}} ({{user_id}}) has a risk score of {{risk_score}} and may need intervention. Recommendations: {{recommendations}}',
 ARRAY['student_name', 'user_id', 'risk_score', 'recommendations']),
('performance_decline_alert', 'Performance Decline Alert', 'performance_decline', 'email',
 'Performance Decline: {{student_name}}',
 'Student {{student_name}} ({{user_id}}) is showing declining performance trends. Current trend: {{trend_strength}}. Please consider providing additional support.',
 ARRAY['student_name', 'user_id', 'trend_strength']),
('system_health_alert', 'System Health Alert', 'system_health', 'email',
 'System Health Issue: {{service_name}}',
 'System health alert for {{service_name}}. Current error rate: {{error_rate}}%. Please investigate immediately.',
 ARRAY['service_name', 'error_rate'])
ON CONFLICT (id) DO NOTHING;

-- Create partitions for time-series data (optional, for large datasets)
-- This would be implemented based on data volume requirements

-- AI Insights tables
CREATE TABLE IF NOT EXISTS ai_insights (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    cohort_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    impact VARCHAR(20) NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    actionable BOOLEAN DEFAULT true,
    recommendations TEXT[],
    data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE,
    acted_upon BOOLEAN DEFAULT false
);

-- Anomaly detection results
CREATE TABLE IF NOT EXISTS anomaly_detections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    anomalies JSONB NOT NULL,
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    investigated BOOLEAN DEFAULT false,
    false_positive BOOLEAN DEFAULT false
);

-- Learning path recommendations
CREATE TABLE IF NOT EXISTS learning_path_recommendations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    skill_assessment JSONB NOT NULL,
    recommended_path JSONB NOT NULL,
    estimated_duration INTEGER NOT NULL, -- in days
    confidence DECIMAL(3,2) NOT NULL,
    reasoning TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted BOOLEAN DEFAULT false,
    progress JSONB
);

-- Engagement predictions
CREATE TABLE IF NOT EXISTS engagement_predictions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    dropout_probability DECIMAL(3,2) NOT NULL CHECK (dropout_probability >= 0 AND dropout_probability <= 1),
    time_to_dropout INTEGER, -- in days
    engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 100),
    risk_factors TEXT[],
    protective_factors TEXT[],
    interventions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    intervention_applied BOOLEAN DEFAULT false
);

-- Smart thresholds for adaptive alerting
CREATE TABLE IF NOT EXISTS smart_thresholds (
    id VARCHAR(255) PRIMARY KEY,
    metric VARCHAR(100) NOT NULL,
    base_threshold DECIMAL(10,4) NOT NULL,
    adaptive_enabled BOOLEAN DEFAULT true,
    learning_rate DECIMAL(3,2) DEFAULT 0.1,
    historical_data JSONB DEFAULT '[]',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performance_score DECIMAL(3,2) DEFAULT 0.5
);

-- Alert insights and recommendations
CREATE TABLE IF NOT EXISTS alert_insights (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    insights TEXT[],
    suggested_actions TEXT[],
    similar_alerts TEXT[],
    predicted_resolution_time INTEGER, -- in minutes
    confidence DECIMAL(3,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

-- Alert status history for tracking
CREATE TABLE IF NOT EXISTS alert_status_history (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by VARCHAR(255),
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

-- Predictive models metadata
CREATE TABLE IF NOT EXISTS predictive_models (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    accuracy DECIMAL(3,2),
    features TEXT[],
    model_data JSONB,
    last_trained TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time analytics cache
CREATE TABLE IF NOT EXISTS analytics_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance forecasting results
CREATE TABLE IF NOT EXISTS performance_forecasts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    forecast_horizon INTEGER NOT NULL, -- in days
    predicted_values JSONB NOT NULL,
    confidence_intervals JSONB NOT NULL,
    model_used VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accuracy_score DECIMAL(3,2)
);

-- Enhanced indexes for AI features
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_type ON ai_insights(user_id, type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated_at ON ai_insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_valid_until ON ai_insights(valid_until);
CREATE INDEX IF NOT EXISTS idx_ai_insights_impact ON ai_insights(impact);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_user_detected ON anomaly_detections(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_score ON anomaly_detections(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_learning_paths_user_created ON learning_path_recommendations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_paths_accepted ON learning_path_recommendations(accepted);

CREATE INDEX IF NOT EXISTS idx_engagement_predictions_user ON engagement_predictions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_predictions_dropout ON engagement_predictions(dropout_probability DESC);

CREATE INDEX IF NOT EXISTS idx_smart_thresholds_metric ON smart_thresholds(metric);
CREATE INDEX IF NOT EXISTS idx_smart_thresholds_updated ON smart_thresholds(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_alert_insights_alert_id ON alert_insights(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_insights_created_at ON alert_insights(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_status_history_alert_id ON alert_status_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_status_history_changed_at ON alert_status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictive_models_type_active ON predictive_models(type, is_active);
CREATE INDEX IF NOT EXISTS idx_predictive_models_updated ON predictive_models(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_performance_forecasts_user_metric ON performance_forecasts(user_id, metric);
CREATE INDEX IF NOT EXISTS idx_performance_forecasts_created_at ON performance_forecasts(created_at DESC);

-- Enhanced views for AI insights
CREATE OR REPLACE VIEW student_risk_summary AS
SELECT 
    rs.user_id,
    rs.risk_score,
    rs.risk_level,
    rs.calculated_at,
    COUNT(a.id) as active_alerts,
    COUNT(ai.id) as active_insights,
    ep.dropout_probability,
    ep.engagement_score
FROM risk_scores rs
LEFT JOIN alerts a ON rs.user_id = a.user_id AND a.status IN ('open', 'acknowledged', 'in_progress')
LEFT JOIN ai_insights ai ON rs.user_id = ai.user_id AND ai.valid_until > NOW() AND ai.acted_upon = false
LEFT JOIN engagement_predictions ep ON rs.user_id = ep.user_id AND ep.created_at >= NOW() - INTERVAL '7 days'
WHERE rs.valid_until > NOW()
GROUP BY rs.user_id, rs.risk_score, rs.risk_level, rs.calculated_at, ep.dropout_probability, ep.engagement_score;

CREATE OR REPLACE VIEW alert_summary AS
SELECT 
    status,
    severity,
    type,
    COUNT(*) as count,
    MIN(created_at) as oldest_alert,
    MAX(created_at) as newest_alert
FROM alerts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status, severity, type;

CREATE OR REPLACE VIEW performance_overview AS
SELECT 
    spd.user_id,
    COUNT(*) as total_submissions,
    AVG(spd.code_quality_score) as avg_code_quality,
    AVG(spd.completion_time) as avg_completion_time,
    AVG(spd.test_coverage) as avg_test_coverage,
    AVG(spd.security_score) as avg_security_score,
    MAX(spd.timestamp) as last_submission,
    rs.risk_score,
    rs.risk_level
FROM student_performance_data spd
LEFT JOIN risk_scores rs ON spd.user_id = rs.user_id AND rs.valid_until > NOW()
WHERE spd.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY spd.user_id, rs.risk_score, rs.risk_level;