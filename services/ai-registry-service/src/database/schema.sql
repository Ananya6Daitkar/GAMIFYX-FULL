-- AI Registry Service Database Schema

-- AI Technologies table
CREATE TABLE IF NOT EXISTS ai_technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP')),
    version VARCHAR(100) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('Open Source', 'Free Tier', 'Community Edition')),
    license_terms VARCHAR(100) NOT NULL,
    deployment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deprecated', 'Testing')),
    cost_structure VARCHAR(50) NOT NULL CHECK (cost_structure IN ('Free', 'Freemium', 'Usage-Based Free Tier')),
    description TEXT,
    repository_url VARCHAR(500),
    documentation_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Training Datasets table
CREATE TABLE IF NOT EXISTS training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL CHECK (source IN ('Hugging Face', 'Kaggle', 'GitHub', 'Academic', 'Public Domain', 'Other')),
    source_url VARCHAR(500),
    license_type VARCHAR(100) NOT NULL,
    dataset_size BIGINT,
    dataset_format VARCHAR(50),
    description TEXT,
    domain VARCHAR(100),
    language VARCHAR(50),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Technology-Dataset relationships (many-to-many)
CREATE TABLE IF NOT EXISTS technology_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_id UUID NOT NULL REFERENCES ai_technologies(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES training_datasets(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN ('Training', 'Validation', 'Testing', 'Fine-tuning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(technology_id, dataset_id, usage_type)
);

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS ai_registry_audit_log (
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
CREATE INDEX IF NOT EXISTS idx_ai_technologies_type ON ai_technologies(type);
CREATE INDEX IF NOT EXISTS idx_ai_technologies_status ON ai_technologies(status);
CREATE INDEX IF NOT EXISTS idx_ai_technologies_provider ON ai_technologies(provider);
CREATE INDEX IF NOT EXISTS idx_ai_technologies_license ON ai_technologies(license_terms);
CREATE INDEX IF NOT EXISTS idx_training_datasets_source ON training_datasets(source);
CREATE INDEX IF NOT EXISTS idx_training_datasets_license ON training_datasets(license_type);
CREATE INDEX IF NOT EXISTS idx_training_datasets_domain ON training_datasets(domain);
CREATE INDEX IF NOT EXISTS idx_technology_datasets_tech_id ON technology_datasets(technology_id);
CREATE INDEX IF NOT EXISTS idx_technology_datasets_dataset_id ON technology_datasets(dataset_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON ai_registry_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON ai_registry_audit_log(changed_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_ai_technologies_updated_at BEFORE UPDATE ON ai_technologies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_datasets_updated_at BEFORE UPDATE ON training_datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();