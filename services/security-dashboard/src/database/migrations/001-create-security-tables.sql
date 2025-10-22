-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id VARCHAR(255) PRIMARY KEY,
    cve_id VARCHAR(50),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    cvss_score DECIMAL(3,1),
    component VARCHAR(255) NOT NULL,
    version VARCHAR(100) NOT NULL,
    fixed_version VARCHAR(100),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'accepted_risk', 'false_positive')),
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    source VARCHAR(100) NOT NULL,
    references JSONB DEFAULT '[]'
);

-- Create threat intelligence table
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('malware', 'phishing', 'botnet', 'apt', 'ddos', 'brute_force', 'sql_injection', 'xss', 'insider_threat')),
    indicator VARCHAR(500) NOT NULL,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    tags JSONB DEFAULT '[]',
    iocs JSONB DEFAULT '[]',
    UNIQUE(indicator, source)
);

-- Create security incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('data_breach', 'malware', 'phishing', 'unauthorized_access', 'system_compromise', 'denial_of_service', 'insider_threat', 'policy_violation')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'investigating', 'containing', 'eradicating', 'recovering', 'resolved', 'closed')),
    reported_by VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    affected_systems JSONB DEFAULT '[]',
    impact_assessment JSONB,
    root_cause TEXT,
    lessons_learned TEXT,
    preventive_measures JSONB DEFAULT '[]'
);

-- Create incident timeline table
CREATE TABLE IF NOT EXISTS incident_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    evidence JSONB DEFAULT '[]'
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('vulnerability', 'threat', 'compliance', 'incident', 'access', 'training', 'system')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'false_positive')),
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create security benchmarks table
CREATE TABLE IF NOT EXISTS security_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework VARCHAR(100) NOT NULL,
    category VARCHAR(255) NOT NULL,
    control VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    current_score INTEGER CHECK (current_score >= 0 AND current_score <= 100),
    target_score INTEGER CHECK (target_score >= 0 AND target_score <= 100),
    industry_average INTEGER CHECK (industry_average >= 0 AND industry_average <= 100),
    last_assessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessor VARCHAR(255),
    evidence JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    UNIQUE(framework, category, control)
);

-- Create audit findings table
CREATE TABLE IF NOT EXISTS audit_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id VARCHAR(255),
    finding_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted_risk')),
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

-- Create security training table
CREATE TABLE IF NOT EXISTS security_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    training_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create phishing tests table
CREATE TABLE IF NOT EXISTS phishing_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255),
    email_subject VARCHAR(500),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(50) CHECK (action IN ('sent', 'opened', 'clicked', 'reported', 'ignored')),
    action_timestamp TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create security events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    event_data JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false
);

-- Create threat blocks table
CREATE TABLE IF NOT EXISTS threat_blocks (
    id VARCHAR(255) PRIMARY KEY,
    indicator VARCHAR(500) NOT NULL,
    indicator_type VARCHAR(50) DEFAULT 'ip',
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_by VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create threat landscape snapshots table
CREATE TABLE IF NOT EXISTS threat_landscape_snapshots (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    landscape_data JSONB NOT NULL
);

-- Create security metrics snapshots table
CREATE TABLE IF NOT EXISTS security_metrics_snapshots (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metrics_data JSONB NOT NULL
);

-- Create security reports table
CREATE TABLE IF NOT EXISTS security_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('executive_summary', 'vulnerability_report', 'threat_intelligence', 'compliance_report', 'incident_report', 'training_report', 'risk_assessment')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(255) NOT NULL,
    period VARCHAR(20) CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'custom')),
    format VARCHAR(20) CHECK (format IN ('pdf', 'html', 'json', 'csv', 'excel')),
    report_data JSONB,
    recipients JSONB DEFAULT '[]',
    scheduled_delivery TIMESTAMP,
    is_scheduled BOOLEAN DEFAULT false
);

-- Create SBOMs table
CREATE TABLE IF NOT EXISTS sboms (
    id VARCHAR(255) PRIMARY KEY,
    component VARCHAR(255) NOT NULL,
    version VARCHAR(100) NOT NULL,
    sbom_data JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(component, version)
);

-- Create risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id VARCHAR(255) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    threats JSONB DEFAULT '[]',
    vulnerabilities JSONB DEFAULT '[]',
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 25),
    risk_level VARCHAR(20) CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    mitigations JSONB DEFAULT '[]',
    residual_risk INTEGER CHECK (residual_risk >= 0 AND residual_risk <= 25),
    assessed_by VARCHAR(255) NOT NULL,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_review TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_discovered_at ON vulnerabilities(discovered_at);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_component ON vulnerabilities(component);

CREATE INDEX IF NOT EXISTS idx_threat_intelligence_type ON threat_intelligence(type);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_severity ON threat_intelligence(severity);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_is_active ON threat_intelligence(is_active);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_indicator ON threat_intelligence(indicator);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_last_seen ON threat_intelligence(last_seen);

CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON security_incidents(type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_reported_at ON security_incidents(reported_at);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);

CREATE INDEX IF NOT EXISTS idx_security_benchmarks_framework ON security_benchmarks(framework);
CREATE INDEX IF NOT EXISTS idx_security_benchmarks_last_assessed ON security_benchmarks(last_assessed);

CREATE INDEX IF NOT EXISTS idx_security_training_user_id ON security_training(user_id);
CREATE INDEX IF NOT EXISTS idx_security_training_status ON security_training(status);
CREATE INDEX IF NOT EXISTS idx_security_training_due_date ON security_training(due_date);

CREATE INDEX IF NOT EXISTS idx_phishing_tests_user_id ON phishing_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_phishing_tests_sent_at ON phishing_tests(sent_at);
CREATE INDEX IF NOT EXISTS idx_phishing_tests_action ON phishing_tests(action);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_processed ON security_events(processed);

CREATE INDEX IF NOT EXISTS idx_threat_blocks_indicator ON threat_blocks(indicator);
CREATE INDEX IF NOT EXISTS idx_threat_blocks_is_active ON threat_blocks(is_active);

CREATE INDEX IF NOT EXISTS idx_security_metrics_snapshots_timestamp ON security_metrics_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_threat_landscape_snapshots_timestamp ON threat_landscape_snapshots(timestamp);

-- Create views for common queries
CREATE OR REPLACE VIEW vulnerability_summary AS
SELECT 
    severity,
    status,
    COUNT(*) as count,
    AVG(cvss_score) as avg_cvss_score,
    AVG(CASE 
        WHEN resolved_at IS NOT NULL AND discovered_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (resolved_at - discovered_at))/3600 
    END) as avg_resolution_hours
FROM vulnerabilities
GROUP BY severity, status;

CREATE OR REPLACE VIEW threat_summary AS
SELECT 
    type,
    severity,
    COUNT(*) as count,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM threat_intelligence
GROUP BY type, severity;

CREATE OR REPLACE VIEW incident_summary AS
SELECT 
    type,
    severity,
    status,
    COUNT(*) as count,
    AVG(CASE 
        WHEN resolved_at IS NOT NULL AND reported_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600 
    END) as avg_resolution_hours
FROM security_incidents
WHERE reported_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY type, severity, status;

CREATE OR REPLACE VIEW compliance_summary AS
SELECT 
    framework,
    AVG(current_score) as avg_score,
    COUNT(*) as total_controls,
    COUNT(CASE WHEN current_score >= target_score THEN 1 END) as compliant_controls,
    MAX(last_assessed) as last_assessment
FROM security_benchmarks
GROUP BY framework;

CREATE OR REPLACE VIEW training_summary AS
SELECT 
    training_type,
    COUNT(*) as total_assigned,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
    AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score
FROM security_training
WHERE assigned_at >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY training_type;

-- Insert sample data for testing
INSERT INTO security_benchmarks (framework, category, control, description, current_score, target_score, industry_average, assessor) VALUES
('NIST 800-53', 'Access Control', 'AC-1', 'Access Control Policy and Procedures', 85, 95, 78, 'security-team'),
('NIST 800-53', 'Identification and Authentication', 'IA-2', 'Identification and Authentication (Organizational Users)', 90, 95, 82, 'security-team'),
('CIS Controls', 'Inventory and Control of Hardware Assets', 'CIS-1', 'Inventory and Control of Hardware Assets', 75, 90, 70, 'security-team'),
('CIS Controls', 'Inventory and Control of Software Assets', 'CIS-2', 'Inventory and Control of Software Assets', 80, 90, 72, 'security-team'),
('GDPR', 'Data Protection', 'Art-32', 'Security of processing', 88, 95, 75, 'privacy-team'),
('SOX', 'IT General Controls', 'ITGC-1', 'Access Controls', 92, 95, 85, 'audit-team')
ON CONFLICT (framework, category, control) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE vulnerabilities IS 'Security vulnerabilities discovered through scanning and analysis';
COMMENT ON TABLE threat_intelligence IS 'Threat intelligence data from various sources';
COMMENT ON TABLE security_incidents IS 'Security incidents and their management lifecycle';
COMMENT ON TABLE security_alerts IS 'Security alerts generated by various monitoring systems';
COMMENT ON TABLE security_benchmarks IS 'Security control benchmarks and compliance scores';
COMMENT ON TABLE security_training IS 'Security awareness training assignments and completion';
COMMENT ON TABLE phishing_tests IS 'Phishing simulation test results';
COMMENT ON TABLE security_events IS 'Security events from various monitoring sources';
COMMENT ON TABLE threat_blocks IS 'Blocked threat indicators and their details';
COMMENT ON TABLE security_reports IS 'Generated security reports and their metadata';