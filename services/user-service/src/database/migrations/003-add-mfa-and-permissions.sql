-- Add MFA and security columns to users table
ALTER TABLE users 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN backup_codes JSONB,
ADD COLUMN last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN locked_until TIMESTAMP;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_roles table for role assignments
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_by UUID REFERENCES users(id),
    revoked_at TIMESTAMP,
    last_reviewed TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Create access audit logs table
CREATE TABLE IF NOT EXISTS access_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('granted', 'denied')),
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permission review tasks table
CREATE TABLE IF NOT EXISTS permission_review_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_user_id ON access_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_timestamp ON access_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_resource_action ON access_audit_logs(resource, action);
CREATE INDEX IF NOT EXISTS idx_permission_review_tasks_status ON permission_review_tasks(status);

-- Create updated_at trigger for roles table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
(
    'student',
    'Basic student access with submission and dashboard viewing',
    '[
        {
            "id": "student-dashboard-read",
            "name": "View Student Dashboard",
            "resource": "dashboard",
            "action": "read",
            "conditions": {"owner": true}
        },
        {
            "id": "submission-create",
            "name": "Create Submissions",
            "resource": "submission",
            "action": "create",
            "conditions": {"owner": true}
        },
        {
            "id": "submission-read-own",
            "name": "View Own Submissions",
            "resource": "submission",
            "action": "read",
            "conditions": {"owner": true}
        },
        {
            "id": "profile-read-own",
            "name": "View Own Profile",
            "resource": "profile",
            "action": "read",
            "conditions": {"owner": true}
        },
        {
            "id": "profile-update-own",
            "name": "Update Own Profile",
            "resource": "profile",
            "action": "update",
            "conditions": {"owner": true}
        }
    ]'::jsonb
),
(
    'teacher',
    'Teacher access with student monitoring and intervention capabilities',
    '[
        {
            "id": "teacher-dashboard-read",
            "name": "View Teacher Dashboard",
            "resource": "teacher-dashboard",
            "action": "read"
        },
        {
            "id": "student-analytics-read",
            "name": "View Student Analytics",
            "resource": "analytics",
            "action": "read",
            "conditions": {"scope": "assigned_students"}
        },
        {
            "id": "intervention-create",
            "name": "Create Interventions",
            "resource": "intervention",
            "action": "create"
        },
        {
            "id": "alert-manage",
            "name": "Manage Alerts",
            "resource": "alert",
            "action": "manage"
        },
        {
            "id": "report-generate",
            "name": "Generate Reports",
            "resource": "report",
            "action": "create"
        },
        {
            "id": "submission-read-students",
            "name": "View Student Submissions",
            "resource": "submission",
            "action": "read",
            "conditions": {"scope": "assigned_students"}
        }
    ]'::jsonb
),
(
    'admin',
    'Full administrative access with user management and system configuration',
    '[
        {
            "id": "user-manage",
            "name": "Manage Users",
            "resource": "user",
            "action": "manage"
        },
        {
            "id": "role-manage",
            "name": "Manage Roles",
            "resource": "role",
            "action": "manage"
        },
        {
            "id": "system-config",
            "name": "System Configuration",
            "resource": "system",
            "action": "configure"
        },
        {
            "id": "audit-read",
            "name": "View Audit Logs",
            "resource": "audit",
            "action": "read"
        },
        {
            "id": "security-manage",
            "name": "Manage Security Settings",
            "resource": "security",
            "action": "manage"
        },
        {
            "id": "analytics-read-all",
            "name": "View All Analytics",
            "resource": "analytics",
            "action": "read",
            "conditions": {"scope": "all"}
        }
    ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Assign default roles to existing users based on their current role
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
    u.id,
    r.id,
    u.id  -- Self-assigned for migration
FROM users u
JOIN roles r ON r.name = u.role
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);

COMMENT ON TABLE roles IS 'System roles with associated permissions';
COMMENT ON TABLE user_roles IS 'User role assignments with expiration and audit trail';
COMMENT ON TABLE access_audit_logs IS 'Audit log for all access control decisions';
COMMENT ON TABLE permission_review_tasks IS 'Tasks for quarterly permission reviews';