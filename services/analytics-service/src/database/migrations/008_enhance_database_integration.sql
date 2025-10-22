-- Migration: Enhance database integration for GitHub PR tracking
-- Version: 008
-- Description: Extend current database schema with PR tracking integration and ensure data consistency

-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Extend existing student_performance_data table to include GitHub context
ALTER TABLE student_performance_data 
ADD COLUMN IF NOT EXISTS github_context JSONB DEFAULT '{}';

-- Add index for GitHub context queries
CREATE INDEX IF NOT EXISTS idx_student_performance_data_github_context 
ON student_performance_data USING GIN (github_context);

-- Create student_records table if it doesn't exist (for integration with existing student records)
CREATE TABLE IF NOT EXISTS student_records (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for student_records
CREATE INDEX IF NOT EXISTS idx_student_records_teacher_id ON student_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_records_status ON student_records(status);
CREATE INDEX IF NOT EXISTS idx_student_records_enrollment_date ON student_records(enrollment_date);

-- Create trigger for student_records updated_at
DROP TRIGGER IF EXISTS trigger_update_student_records_updated_at ON student_records;
CREATE TRIGGER trigger_update_student_records_updated_at
    BEFORE UPDATE ON student_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create comprehensive student analytics view
CREATE OR REPLACE VIEW comprehensive_student_analytics AS
SELECT 
    sr.id as student_id,
    sr.name as student_name,
    sr.email as student_email,
    sr.teacher_id,
    sr.status as enrollment_status,
    sr.enrollment_date,
    
    -- GitHub profile information
    sgp.github_username,
    sgp.is_verified as github_verified,
    sgp.verification_method,
    
    -- PR statistics
    COALESCE(sps_stats.total_prs, 0) as total_prs,
    COALESCE(sps_stats.merged_prs, 0) as merged_prs,
    COALESCE(sps_stats.open_prs, 0) as open_prs,
    COALESCE(sps_stats.prs_this_week, 0) as prs_this_week,
    COALESCE(sps_stats.prs_this_month, 0) as prs_this_month,
    sps_stats.last_pr_date,
    COALESCE(sps_stats.avg_pr_size, 0) as avg_pr_size,
    
    -- Performance data summary
    COALESCE(perf_stats.avg_code_quality, 0) as avg_code_quality,
    COALESCE(perf_stats.avg_completion_time, 0) as avg_completion_time,
    COALESCE(perf_stats.avg_test_coverage, 0) as avg_test_coverage,
    COALESCE(perf_stats.total_submissions, 0) as total_submissions,
    perf_stats.last_submission_date,
    
    -- Combined metrics
    CASE 
        WHEN sps_stats.total_prs > 0 AND perf_stats.total_submissions > 0 THEN 'active'
        WHEN sps_stats.total_prs > 0 OR perf_stats.total_submissions > 0 THEN 'partially_active'
        ELSE 'inactive'
    END as activity_status,
    
    -- Risk indicators
    CASE 
        WHEN sps_stats.total_prs = 0 AND perf_stats.total_submissions = 0 THEN 'high'
        WHEN (sps_stats.prs_this_week = 0 AND sps_stats.total_prs > 0) OR 
             (perf_stats.avg_code_quality < 60) THEN 'medium'
        ELSE 'low'
    END as risk_level

FROM student_records sr
LEFT JOIN student_github_profiles sgp ON sr.id = sgp.student_id
LEFT JOIN (
    SELECT 
        sgp.student_id,
        COUNT(sps.id) as total_prs,
        COUNT(CASE WHEN sps.status = 'merged' THEN 1 END) as merged_prs,
        COUNT(CASE WHEN sps.status = 'open' THEN 1 END) as open_prs,
        COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
        COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month,
        MAX(sps.created_at) as last_pr_date,
        AVG(sps.lines_changed) as avg_pr_size
    FROM student_github_profiles sgp
    LEFT JOIN student_pr_submissions sps ON sgp.github_username = sps.github_username
    WHERE sgp.is_verified = true
    GROUP BY sgp.student_id
) sps_stats ON sr.id = sps_stats.student_id
LEFT JOIN (
    SELECT 
        user_id as student_id,
        AVG(code_quality_score) as avg_code_quality,
        AVG(completion_time) as avg_completion_time,
        AVG(test_coverage) as avg_test_coverage,
        COUNT(*) as total_submissions,
        MAX(timestamp) as last_submission_date
    FROM student_performance_data
    GROUP BY user_id
) perf_stats ON sr.id = perf_stats.student_id;

-- Create teacher dashboard summary view
CREATE OR REPLACE VIEW teacher_dashboard_summary AS
SELECT 
    sr.teacher_id,
    COUNT(DISTINCT sr.id) as total_students,
    COUNT(DISTINCT CASE WHEN sgp.is_verified = true THEN sr.id END) as students_with_github,
    COUNT(DISTINCT CASE WHEN sps_recent.student_id IS NOT NULL THEN sr.id END) as students_with_recent_prs,
    COUNT(DISTINCT CASE WHEN perf_recent.student_id IS NOT NULL THEN sr.id END) as students_with_recent_submissions,
    
    -- PR statistics
    COALESCE(SUM(sps_stats.total_prs), 0) as class_total_prs,
    COALESCE(AVG(sps_stats.total_prs), 0) as avg_prs_per_student,
    COALESCE(SUM(sps_stats.prs_this_week), 0) as class_prs_this_week,
    
    -- Performance statistics
    COALESCE(AVG(perf_stats.avg_code_quality), 0) as class_avg_code_quality,
    COALESCE(AVG(perf_stats.avg_test_coverage), 0) as class_avg_test_coverage,
    
    -- Risk analysis
    COUNT(CASE WHEN csa.risk_level = 'high' THEN 1 END) as high_risk_students,
    COUNT(CASE WHEN csa.risk_level = 'medium' THEN 1 END) as medium_risk_students,
    COUNT(CASE WHEN csa.risk_level = 'low' THEN 1 END) as low_risk_students,
    
    -- Activity analysis
    COUNT(CASE WHEN csa.activity_status = 'active' THEN 1 END) as active_students,
    COUNT(CASE WHEN csa.activity_status = 'partially_active' THEN 1 END) as partially_active_students,
    COUNT(CASE WHEN csa.activity_status = 'inactive' THEN 1 END) as inactive_students

FROM student_records sr
LEFT JOIN comprehensive_student_analytics csa ON sr.id = csa.student_id
LEFT JOIN student_github_profiles sgp ON sr.id = sgp.student_id
LEFT JOIN (
    SELECT sgp.student_id, COUNT(*) as total_prs
    FROM student_github_profiles sgp
    JOIN student_pr_submissions sps ON sgp.github_username = sps.github_username
    GROUP BY sgp.student_id
) sps_stats ON sr.id = sps_stats.student_id
LEFT JOIN (
    SELECT sgp.student_id
    FROM student_github_profiles sgp
    JOIN student_pr_submissions sps ON sgp.github_username = sps.github_username
    WHERE sps.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY sgp.student_id
) sps_recent ON sr.id = sps_recent.student_id
LEFT JOIN (
    SELECT user_id as student_id, AVG(code_quality_score) as avg_code_quality, AVG(test_coverage) as avg_test_coverage
    FROM student_performance_data
    GROUP BY user_id
) perf_stats ON sr.id = perf_stats.student_id
LEFT JOIN (
    SELECT user_id as student_id
    FROM student_performance_data
    WHERE timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY user_id
) perf_recent ON sr.id = perf_recent.student_id
WHERE sr.status = 'active'
GROUP BY sr.teacher_id;

-- Create data consistency check function
CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS TABLE (
    check_name VARCHAR(100),
    status VARCHAR(20),
    details TEXT
) AS $$
BEGIN
    -- Check for students with GitHub profiles but no student records
    RETURN QUERY
    SELECT 
        'orphaned_github_profiles'::VARCHAR(100) as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20) as status,
        CONCAT('Found ', COUNT(*), ' GitHub profiles without corresponding student records')::TEXT as details
    FROM student_github_profiles sgp
    LEFT JOIN student_records sr ON sgp.student_id = sr.id
    WHERE sr.id IS NULL;
    
    -- Check for PR submissions without GitHub profiles
    RETURN QUERY
    SELECT 
        'orphaned_pr_submissions'::VARCHAR(100) as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20) as status,
        CONCAT('Found ', COUNT(*), ' PR submissions without corresponding GitHub profiles')::TEXT as details
    FROM student_pr_submissions sps
    LEFT JOIN student_github_profiles sgp ON sps.github_username = sgp.github_username
    WHERE sgp.id IS NULL;
    
    -- Check for performance data without student records
    RETURN QUERY
    SELECT 
        'orphaned_performance_data'::VARCHAR(100) as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20) as status,
        CONCAT('Found ', COUNT(*), ' performance records without corresponding student records')::TEXT as details
    FROM student_performance_data spd
    LEFT JOIN student_records sr ON spd.user_id = sr.id
    WHERE sr.id IS NULL;
    
    -- Check for duplicate GitHub usernames
    RETURN QUERY
    SELECT 
        'duplicate_github_usernames'::VARCHAR(100) as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20) as status,
        CONCAT('Found ', COUNT(*), ' duplicate GitHub usernames')::TEXT as details
    FROM (
        SELECT github_username, teacher_id, COUNT(*) as cnt
        FROM student_github_profiles
        WHERE is_verified = true
        GROUP BY github_username, teacher_id
        HAVING COUNT(*) > 1
    ) duplicates;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync student data across tables
CREATE OR REPLACE FUNCTION sync_student_data(p_student_id VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    student_exists BOOLEAN;
    github_profile_exists BOOLEAN;
BEGIN
    -- Check if student record exists
    SELECT EXISTS(SELECT 1 FROM student_records WHERE id = p_student_id) INTO student_exists;
    
    -- Check if GitHub profile exists
    SELECT EXISTS(SELECT 1 FROM student_github_profiles WHERE student_id = p_student_id) INTO github_profile_exists;
    
    -- If student has GitHub profile but no student record, create a placeholder
    IF github_profile_exists AND NOT student_exists THEN
        INSERT INTO student_records (id, name, teacher_id, status, metadata)
        SELECT 
            sgp.student_id,
            'Student ' || sgp.student_id,
            sgp.teacher_id,
            'active',
            jsonb_build_object('created_from_github_profile', true, 'github_username', sgp.github_username)
        FROM student_github_profiles sgp
        WHERE sgp.student_id = p_student_id
        LIMIT 1;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
    cleanup_action VARCHAR(100),
    records_affected INTEGER
) AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Clean up PR submissions without GitHub profiles (older than 30 days)
    DELETE FROM student_pr_submissions sps
    WHERE NOT EXISTS (
        SELECT 1 FROM student_github_profiles sgp 
        WHERE sgp.github_username = sps.github_username
    ) AND sps.created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT 'orphaned_pr_submissions_deleted'::VARCHAR(100), affected_count;
    
    -- Clean up old webhook events (older than 90 days)
    DELETE FROM github_webhook_events 
    WHERE received_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT 'old_webhook_events_deleted'::VARCHAR(100), affected_count;
    
    -- Clean up expired PR analysis cache
    DELETE FROM pr_analysis_cache 
    WHERE valid_until < NOW();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT 'expired_pr_analysis_cache_deleted'::VARCHAR(100), affected_count;
    
    -- Clean up old rate limit records (older than 7 days)
    DELETE FROM github_rate_limits 
    WHERE recorded_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN QUERY SELECT 'old_rate_limit_records_deleted'::VARCHAR(100), affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for performance optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_performance_summary AS
SELECT 
    csa.student_id,
    csa.student_name,
    csa.teacher_id,
    csa.github_username,
    csa.total_prs,
    csa.merged_prs,
    csa.prs_this_week,
    csa.avg_code_quality,
    csa.total_submissions,
    csa.activity_status,
    csa.risk_level,
    NOW() as last_refreshed
FROM comprehensive_student_analytics csa
WHERE csa.enrollment_status = 'active';

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_student_performance_summary_student_id 
ON mv_student_performance_summary(student_id);

-- Create index for teacher queries
CREATE INDEX IF NOT EXISTS idx_mv_student_performance_summary_teacher_id 
ON mv_student_performance_summary(teacher_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_student_performance_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to refresh materialized view (requires pg_cron extension)
-- SELECT cron.schedule('refresh-student-performance', '*/15 * * * *', 'SELECT refresh_student_performance_summary();');

-- Add constraints to ensure data integrity
ALTER TABLE student_github_profiles 
ADD CONSTRAINT fk_student_github_profiles_student_id 
FOREIGN KEY (student_id) REFERENCES student_records(id) ON DELETE CASCADE;

-- Add constraint to ensure PR submissions reference valid GitHub profiles
-- Note: This is commented out as it might break existing data
-- ALTER TABLE student_pr_submissions 
-- ADD CONSTRAINT fk_student_pr_submissions_github_username 
-- FOREIGN KEY (github_username) REFERENCES student_github_profiles(github_username) ON DELETE CASCADE;

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS data_audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_data_audit_log_table_name ON data_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_operation ON data_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_changed_at ON data_audit_log(changed_at DESC);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO data_audit_log (table_name, operation, record_id, old_values)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id::TEXT, row_to_json(OLD)::JSONB);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO data_audit_log (table_name, operation, record_id, old_values, new_values)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id::TEXT, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO data_audit_log (table_name, operation, record_id, new_values)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id::TEXT, row_to_json(NEW)::JSONB);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for key tables
DROP TRIGGER IF EXISTS audit_student_records ON student_records;
CREATE TRIGGER audit_student_records
    AFTER INSERT OR UPDATE OR DELETE ON student_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_student_github_profiles ON student_github_profiles;
CREATE TRIGGER audit_student_github_profiles
    AFTER INSERT OR UPDATE OR DELETE ON student_github_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Grant necessary permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO analytics_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO analytics_service_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO analytics_service_user;

-- Add comments for documentation
COMMENT ON VIEW comprehensive_student_analytics IS 'Comprehensive view combining student records, GitHub profiles, PR statistics, and performance data';
COMMENT ON VIEW teacher_dashboard_summary IS 'Summary view for teacher dashboard showing class-wide statistics';
COMMENT ON FUNCTION check_data_consistency() IS 'Function to check data consistency across related tables';
COMMENT ON FUNCTION sync_student_data(VARCHAR) IS 'Function to synchronize student data across tables';
COMMENT ON FUNCTION cleanup_orphaned_data() IS 'Function to clean up orphaned and old data';
COMMENT ON MATERIALIZED VIEW mv_student_performance_summary IS 'Materialized view for optimized student performance queries';
COMMENT ON TABLE data_audit_log IS 'Audit log for tracking changes to critical tables';