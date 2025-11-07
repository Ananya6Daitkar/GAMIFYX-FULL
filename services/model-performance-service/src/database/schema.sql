-- Model Performance Service Database Schema

-- AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('LLM', 'SLM', 'ML', 'Computer Vision', 'NLP')),
    version VARCHAR(100) NOT NULL,
    framework VARCHAR(100), -- Hugging Face, TensorFlow, PyTorch, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(name, version)
);

-- Model Performance Metrics table
CREATE TABLE IF NOT EXISTS model_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    accuracy DECIMAL(5,4) CHECK (accuracy >= 0 AND accuracy <= 1),
    precision_score DECIMAL(5,4) CHECK (precision_score >= 0 AND precision_score <= 1),
    recall_score DECIMAL(5,4) CHECK (recall_score >= 0 AND recall_score <= 1),
    f1_score DECIMAL(5,4) CHECK (f1_score >= 0 AND f1_score <= 1),
    validation_method VARCHAR(100) NOT NULL,
    test_dataset_name VARCHAR(255),
    test_dataset_size INTEGER,
    training_duration_minutes INTEGER,
    inference_time_ms DECIMAL(10,3),
    memory_usage_mb DECIMAL(10,2),
    measurement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validated_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Benchmarks table
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type VARCHAR(50) NOT NULL,
    task_category VARCHAR(100) NOT NULL, -- Classification, Regression, Generation, etc.
    benchmark_name VARCHAR(255) NOT NULL,
    min_accuracy DECIMAL(5,4),
    target_accuracy DECIMAL(5,4),
    min_precision DECIMAL(5,4),
    target_precision DECIMAL(5,4),
    min_recall DECIMAL(5,4),
    target_recall DECIMAL(5,4),
    min_f1_score DECIMAL(5,4),
    target_f1_score DECIMAL(5,4),
    max_inference_time_ms DECIMAL(10,3),
    max_memory_usage_mb DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(model_type, task_category, benchmark_name)
);

-- Performance Alerts table
CREATE TABLE IF NOT EXISTS performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('Performance Degradation', 'Benchmark Failure', 'Resource Limit', 'Validation Error')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    message TEXT NOT NULL,
    metric_name VARCHAR(100),
    current_value DECIMAL(10,4),
    threshold_value DECIMAL(10,4),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Acknowledged', 'Resolved', 'Dismissed')),
    resolution_notes TEXT
);

-- Validation Methodologies table
CREATE TABLE IF NOT EXISTS validation_methodologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    methodology_type VARCHAR(50) NOT NULL CHECK (methodology_type IN ('Cross Validation', 'Holdout', 'Bootstrap', 'Time Series Split')),
    parameters JSONB, -- Store methodology-specific parameters
    is_standard BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- Model Performance Trends (materialized view for analytics)
CREATE TABLE IF NOT EXISTS model_performance_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    trend_period VARCHAR(20) NOT NULL CHECK (trend_period IN ('Daily', 'Weekly', 'Monthly')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    avg_value DECIMAL(10,4),
    min_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    measurement_count INTEGER,
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('Improving', 'Stable', 'Degrading')),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, metric_name, trend_period, period_start)
);

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS model_performance_audit_log (
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
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(type);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_model_metrics_model_id ON model_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_model_metrics_measurement_date ON model_metrics(measurement_date);
CREATE INDEX IF NOT EXISTS idx_model_metrics_validation_method ON model_metrics(validation_method);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_type_category ON performance_benchmarks(model_type, task_category);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_model_id ON performance_alerts(model_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_status ON performance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_performance_trends_model_metric ON model_performance_trends(model_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_trends_period ON model_performance_trends(trend_period, period_start);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON model_performance_audit_log(table_name, record_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_benchmarks_updated_at BEFORE UPDATE ON performance_benchmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default validation methodologies
INSERT INTO validation_methodologies (name, description, methodology_type, parameters, is_standard) VALUES
('K-Fold Cross Validation', 'Divide dataset into k folds, train on k-1 folds, test on remaining fold', 'Cross Validation', '{"k": 5}', true),
('Stratified K-Fold', 'K-fold cross validation that preserves class distribution', 'Cross Validation', '{"k": 5, "stratified": true}', true),
('Hold-Out Validation', 'Split dataset into training and testing sets', 'Holdout', '{"test_size": 0.2, "random_state": 42}', true),
('Time Series Split', 'Sequential splits for time-dependent data', 'Time Series Split', '{"n_splits": 5}', true),
('Bootstrap Validation', 'Random sampling with replacement for validation', 'Bootstrap', '{"n_bootstrap": 1000}', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default performance benchmarks for common model types
INSERT INTO performance_benchmarks (model_type, task_category, benchmark_name, target_accuracy, target_precision, target_recall, target_f1_score, max_inference_time_ms, max_memory_usage_mb) VALUES
('ML', 'Binary Classification', 'Standard Binary Classification', 0.85, 0.80, 0.80, 0.80, 100, 512),
('ML', 'Multi-class Classification', 'Standard Multi-class Classification', 0.80, 0.75, 0.75, 0.75, 150, 512),
('ML', 'Regression', 'Standard Regression', NULL, NULL, NULL, NULL, 50, 256),
('NLP', 'Text Classification', 'Standard Text Classification', 0.85, 0.80, 0.80, 0.80, 200, 1024),
('NLP', 'Sentiment Analysis', 'Standard Sentiment Analysis', 0.88, 0.85, 0.85, 0.85, 150, 512),
('Computer Vision', 'Image Classification', 'Standard Image Classification', 0.90, 0.85, 0.85, 0.85, 300, 2048),
('Computer Vision', 'Object Detection', 'Standard Object Detection', 0.75, 0.70, 0.70, 0.70, 500, 4096),
('LLM', 'Text Generation', 'Standard Text Generation', NULL, NULL, NULL, NULL, 1000, 8192),
('SLM', 'Text Generation', 'Standard Small Model Generation', NULL, NULL, NULL, NULL, 500, 2048)
ON CONFLICT (model_type, task_category, benchmark_name) DO NOTHING;