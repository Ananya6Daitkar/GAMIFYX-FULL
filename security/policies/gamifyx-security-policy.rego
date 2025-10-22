# GamifyX Security Policy - Open Policy Agent (OPA) Rules
# Comprehensive security policies for the GamifyX AIOps Learning Platform

package gamifyx.security

import rego.v1

# Default deny policy
default allow := false

# Authentication and Authorization Policies

# Allow authenticated users with valid JWT tokens
allow if {
    input.method != "OPTIONS"
    valid_jwt_token
    user_has_required_permissions
}

# Allow OPTIONS requests for CORS preflight
allow if {
    input.method == "OPTIONS"
}

# JWT Token Validation
valid_jwt_token if {
    auth_header := input.headers.authorization
    startswith(auth_header, "Bearer ")
    token := substring(auth_header, 7, -1)
    jwt.verify_rs256(token, data.public_key)
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    payload.exp > time.now_ns() / 1000000000
}

# User Permission Validation
user_has_required_permissions if {
    token := extract_jwt_token
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    user_role := payload.role
    required_permission := required_permissions[input.path][input.method]
    role_permissions[user_role][required_permission]
}

# Extract JWT token from Authorization header
extract_jwt_token := token if {
    auth_header := input.headers.authorization
    startswith(auth_header, "Bearer ")
    token := substring(auth_header, 7, -1)
}

# Role-based permissions mapping
role_permissions := {
    "admin": {
        "read": true,
        "write": true,
        "delete": true,
        "manage_users": true,
        "view_analytics": true,
        "manage_system": true
    },
    "teacher": {
        "read": true,
        "write": true,
        "delete": false,
        "manage_users": false,
        "view_analytics": true,
        "manage_system": false
    },
    "student": {
        "read": true,
        "write": false,
        "delete": false,
        "manage_users": false,
        "view_analytics": false,
        "manage_system": false
    }
}

# Required permissions for different endpoints
required_permissions := {
    "/api/users": {
        "GET": "read",
        "POST": "manage_users",
        "PUT": "manage_users",
        "DELETE": "manage_users"
    },
    "/api/submissions": {
        "GET": "read",
        "POST": "write",
        "PUT": "write",
        "DELETE": "delete"
    },
    "/api/gamification": {
        "GET": "read",
        "POST": "write",
        "PUT": "write",
        "DELETE": "delete"
    },
    "/api/analytics": {
        "GET": "view_analytics",
        "POST": "view_analytics"
    },
    "/api/admin": {
        "GET": "manage_system",
        "POST": "manage_system",
        "PUT": "manage_system",
        "DELETE": "manage_system"
    }
}

# Rate Limiting Policies
rate_limit_exceeded if {
    client_ip := input.client_ip
    current_requests := data.rate_limits[client_ip].requests
    time_window := data.rate_limits[client_ip].window
    max_requests := rate_limits[input.path].max_requests
    window_duration := rate_limits[input.path].window_duration
    
    current_requests >= max_requests
    time.now_ns() - time_window < window_duration * 1000000000
}

# Rate limit configuration
rate_limits := {
    "/api/auth/login": {
        "max_requests": 5,
        "window_duration": 300  # 5 minutes
    },
    "/api/submissions": {
        "max_requests": 100,
        "window_duration": 3600  # 1 hour
    },
    "/api/gamification": {
        "max_requests": 1000,
        "window_duration": 3600  # 1 hour
    }
}

# Input Validation Policies
valid_input if {
    not contains_malicious_patterns
    valid_content_type
    valid_content_length
}

# Check for malicious patterns in input
contains_malicious_patterns if {
    malicious_patterns := [
        "<script",
        "javascript:",
        "onload=",
        "onerror=",
        "eval(",
        "document.cookie",
        "DROP TABLE",
        "UNION SELECT",
        "../",
        "..\\",
        "cmd.exe",
        "/bin/sh"
    ]
    
    some pattern in malicious_patterns
    contains(lower(input.body), lower(pattern))
}

# Validate content type
valid_content_type if {
    allowed_content_types := [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain"
    ]
    
    content_type := input.headers["content-type"]
    some allowed_type in allowed_content_types
    startswith(content_type, allowed_type)
}

# Validate content length
valid_content_length if {
    content_length := to_number(input.headers["content-length"])
    max_content_length := 10485760  # 10MB
    content_length <= max_content_length
}

# Security Headers Policies
required_security_headers := {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}

# CORS Policies
valid_cors_origin if {
    allowed_origins := [
        "https://gamifyx.example.com",
        "https://dashboard.gamifyx.example.com",
        "http://localhost:3000",
        "http://localhost:8080"
    ]
    
    origin := input.headers.origin
    origin in allowed_origins
}

# Data Privacy and Protection Policies
sensitive_data_access_allowed if {
    token := extract_jwt_token
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    user_id := payload.sub
    
    # Users can only access their own sensitive data
    requested_user_id := input.path_params.user_id
    user_id == requested_user_id
}

# Teacher can access student data only for their classes
teacher_student_access_allowed if {
    token := extract_jwt_token
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    teacher_id := payload.sub
    student_id := input.path_params.student_id
    
    # Check if teacher has access to this student
    data.teacher_student_relationships[teacher_id][student_id]
}

# Audit Logging Requirements
audit_required if {
    sensitive_endpoints := [
        "/api/users",
        "/api/admin",
        "/api/analytics",
        "/api/submissions"
    ]
    
    some endpoint in sensitive_endpoints
    startswith(input.path, endpoint)
}

# Compliance Policies (FERPA, GDPR, etc.)
ferpa_compliant if {
    # Educational records access must be logged and authorized
    educational_data_endpoints := [
        "/api/submissions",
        "/api/analytics/student",
        "/api/gamification/student"
    ]
    
    some endpoint in educational_data_endpoints
    startswith(input.path, endpoint)
    
    # Must have valid educational interest
    token := extract_jwt_token
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    payload.role in ["teacher", "admin"]
}

gdpr_compliant if {
    # Personal data access must be authorized and logged
    personal_data_endpoints := [
        "/api/users/profile",
        "/api/users/personal"
    ]
    
    some endpoint in personal_data_endpoints
    startswith(input.path, endpoint)
    
    # User must consent to data processing or have legitimate interest
    has_user_consent or has_legitimate_interest
}

has_user_consent if {
    token := extract_jwt_token
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    user_id := payload.sub
    data.user_consents[user_id].data_processing == true
}

has_legitimate_interest if {
    token := extract_jwt_token
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    payload.role in ["teacher", "admin"]
}

# API Security Policies
api_security_check if {
    valid_api_version
    valid_request_signature
    not_replay_attack
}

valid_api_version if {
    api_version := input.headers["x-api-version"]
    supported_versions := ["v1", "v2"]
    api_version in supported_versions
}

valid_request_signature if {
    # Validate HMAC signature for sensitive operations
    sensitive_operations := ["POST", "PUT", "DELETE"]
    input.method in sensitive_operations
    
    signature := input.headers["x-signature"]
    expected_signature := crypto.hmac.sha256(input.body, data.api_secret)
    signature == expected_signature
}

not_replay_attack if {
    timestamp := to_number(input.headers["x-timestamp"])
    current_time := time.now_ns() / 1000000000
    time_diff := current_time - timestamp
    
    # Request must be within 5 minutes
    time_diff <= 300
}

# WebSocket Security Policies
websocket_connection_allowed if {
    valid_websocket_origin
    valid_websocket_token
    not_exceeding_connection_limit
}

valid_websocket_origin if {
    allowed_ws_origins := [
        "wss://gamifyx.example.com",
        "ws://localhost:3000"
    ]
    
    origin := input.websocket.origin
    origin in allowed_ws_origins
}

valid_websocket_token if {
    token := input.websocket.token
    jwt.verify_rs256(token, data.public_key)
    payload := jwt.decode_verify(token, {"secret": data.jwt_secret})
    payload.exp > time.now_ns() / 1000000000
}

not_exceeding_connection_limit if {
    user_connections := data.websocket_connections[input.user_id]
    max_connections := 5
    count(user_connections) < max_connections
}

# File Upload Security Policies
file_upload_allowed if {
    valid_file_type
    valid_file_size
    virus_scan_passed
}

valid_file_type if {
    allowed_extensions := [".js", ".ts", ".py", ".java", ".cpp", ".c", ".go", ".rs"]
    file_extension := input.file.extension
    file_extension in allowed_extensions
}

valid_file_size if {
    file_size := input.file.size
    max_file_size := 5242880  # 5MB
    file_size <= max_file_size
}

virus_scan_passed if {
    # Assume virus scanning is performed externally
    input.file.virus_scan_result == "clean"
}