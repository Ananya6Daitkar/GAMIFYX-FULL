-- Guardrail Service Database Schema

-- Guardrail Policies table
CREATE TABLE IF NOT EXISTS guardrail_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Bias Detection', 'Content Filter', 'Compliance Check', 'Safety Monitor')),
    description TEXT,
    rules JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('Log', 'Block', 'Modify', 'Alert')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Bias Detection Results table
CREATE TABLE IF NOT EXISTS bias_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES guardrail_policies(id) ON DELETE CASCADE,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of analyzed content
    bias_type VARCHAR(50) NOT NULL CHECK (bias_type IN ('Gender', 'Race', 'Age', 'Religion', 'Nationality', 'Disability', 'Sexual Orientation', 'Other')),
    bias_score DECIMAL(5,4) CHECK (bias_score >= 0 AND bias_score <= 1),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detected_terms JSONB, -- Array of problematic terms found
    context_analysis JSONB, -- Additional context information
    demographic_parity DECIMAL(5,4), -- Fairness metric
    equalized_odds DECIMAL(5,4), -- Fairness metric
    action_taken VARCHAR(20) NOT NULL CHECK (action_taken IN ('None', 'Logged', 'Blocked', 'Modified', 'Alerted')),
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analyzed_by VARCHAR(255)
);

-- Content Filter Results table
CREATE TABLE IF NOT EXISTS content_filter_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES guardrail_policies(id) ON DELETE CASCADE,
    content_hash VARCHAR(64) NOT NULL,
    filter_type VARCHAR(50) NOT NULL CHECK (filter_type IN ('Profanity', 'Hate Speech', 'Violence', 'Adult Content', 'Misinformation', 'Spam', 'Other')),
    severity_score DECIMAL(5,4) CHECK (severity_score >= 0 AND severity_score <= 1),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detected_patterns JSONB, -- Patterns that triggered the filter
    sentiment_score DECIMAL(5,4) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    toxicity_score DECIMAL(5,4) CHECK (toxicity_score >= 0 AND toxicity_score <= 1),
    action_taken VARCHAR(20) NOT NULL CHECK (action_taken IN ('None', 'Logged', 'Blocked', 'Modified', 'Alerted')),
    original_content_length INTEGER,
    modified_content_length INTEGER,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analyzed_by VARCHAR(255)
);

-- Compliance Violations table
CREATE TABLE IF NOT EXISTS compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES guardrail_policies(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    regulation VARCHAR(100), -- GDPR, CCPA, HIPAA, etc.
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    content_hash VARCHAR(64),
    metadata JSONB, -- Additional violation context
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Acknowledged', 'Resolved', 'Dismissed')),
    resolution_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    detected_by VARCHAR(255),
    resolved_by VARCHAR(255)
);

-- Safety Interventions table
CREATE TABLE IF NOT EXISTS safety_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_type VARCHAR(50) NOT NULL CHECK (intervention_type IN ('Content Block', 'Content Modification', 'User Warning', 'Rate Limiting', 'Account Suspension')),
    trigger_policy_id UUID REFERENCES guardrail_policies(id),
    content_hash VARCHAR(64),
    user_identifier VARCHAR(255), -- Anonymized user ID
    intervention_reason TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    automated BOOLEAN DEFAULT TRUE,
    effectiveness_score DECIMAL(5,4), -- How effective was the intervention
    user_feedback JSONB, -- User response to intervention
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    triggered_by VARCHAR(255)
);

-- Guardrail Metrics table (for performance tracking)
CREATE TABLE IF NOT EXISTS guardrail_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES guardrail_policies(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_analyses INTEGER DEFAULT 0,
    violations_detected INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    false_negatives INTEGER DEFAULT 0,
    avg_processing_time_ms DECIMAL(10,3),
    accuracy_rate DECIMAL(5,4),
    precision_rate DECIMAL(5,4),
    recall_rate DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_id, metric_date)
);

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS guardrail_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guardrail_policies_type ON guardrail_policies(type);
CREATE INDEX IF NOT EXISTS idx_guardrail_policies_active ON guardrail_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_bias_detection_policy_id ON bias_detection_results(policy_id);
CREATE INDEX IF NOT EXISTS idx_bias_detection_analyzed_at ON bias_detection_results(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_bias_detection_bias_type ON bias_detection_results(bias_type);
CREATE INDEX IF NOT EXISTS idx_content_filter_policy_id ON content_filter_results(policy_id);
CREATE INDEX IF NOT EXISTS idx_content_filter_analyzed_at ON content_filter_results(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_content_filter_type ON content_filter_results(filter_type);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_safety_interventions_triggered_at ON safety_interventions(triggered_at);
CREATE INDEX IF NOT EXISTS idx_safety_interventions_type ON safety_interventions(intervention_type);
CREATE INDEX IF NOT EXISTS idx_guardrail_metrics_policy_date ON guardrail_metrics(policy_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON guardrail_audit_log(table_name, record_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_guardrail_policies_updated_at BEFORE UPDATE ON guardrail_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default guardrail policies
INSERT INTO guardrail_policies (name, type, description, rules, severity, action) VALUES
('Gender Bias Detection', 'Bias Detection', 'Detects gender-based bias in AI outputs', 
 '{"bias_types": ["gender"], "threshold": 0.7, "protected_attributes": ["gender", "sex"], "fairness_metrics": ["demographic_parity", "equalized_odds"]}', 
 'High', 'Alert'),
 
('Racial Bias Detection', 'Bias Detection', 'Detects racial and ethnic bias in AI outputs',
 '{"bias_types": ["race", "ethnicity"], "threshold": 0.7, "protected_attributes": ["race", "ethnicity", "nationality"], "fairness_metrics": ["demographic_parity", "equalized_odds"]}',
 'Critical', 'Block'),
 
('Age Bias Detection', 'Bias Detection', 'Detects age-based discrimination in AI outputs',
 '{"bias_types": ["age"], "threshold": 0.6, "protected_attributes": ["age", "generation"], "fairness_metrics": ["demographic_parity"]}',
 'Medium', 'Log'),
 
('Profanity Filter', 'Content Filter', 'Filters profane and offensive language',
 '{"filter_types": ["profanity"], "severity_threshold": 0.8, "block_explicit": true, "replacement_strategy": "asterisk"}',
 'Medium', 'Modify'),
 
('Hate Speech Filter', 'Content Filter', 'Detects and blocks hate speech content',
 '{"filter_types": ["hate_speech"], "severity_threshold": 0.7, "categories": ["racial", "religious", "gender", "sexual_orientation"], "action": "block"}',
 'Critical', 'Block'),
 
('Violence Content Filter', 'Content Filter', 'Filters violent and harmful content',
 '{"filter_types": ["violence"], "severity_threshold": 0.8, "categories": ["graphic_violence", "threats", "self_harm"], "action": "block"}',
 'High', 'Block'),
 
('GDPR Compliance Check', 'Compliance Check', 'Ensures GDPR compliance in data processing',
 '{"regulation": "GDPR", "checks": ["data_minimization", "consent_verification", "right_to_erasure"], "severity": "critical"}',
 'Critical', 'Alert'),
 
('Safety Monitor', 'Safety Monitor', 'General safety monitoring for AI outputs',
 '{"monitor_types": ["toxicity", "misinformation", "harmful_advice"], "threshold": 0.6, "real_time": true}',
 'High', 'Alert')
ON CONFLICT (name) DO NOTHING;