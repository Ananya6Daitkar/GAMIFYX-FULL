#!/bin/bash

# Software Bill of Materials (SBOM) Generation Script
# Generates comprehensive SBOMs for all AIOps Learning Platform components
# Supports SPDX and CycloneDX formats using Syft and CycloneDX tools

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SBOM_OUTPUT_DIR="$PROJECT_ROOT/security/sbom/output"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Syft is installed
    if ! command -v syft &> /dev/null; then
        log_error "Syft is not installed. Please install it from: https://github.com/anchore/syft"
        exit 1
    fi
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not available"
        exit 1
    fi
    
    # Check if CycloneDX CLI is available (optional)
    if command -v cyclonedx &> /dev/null; then
        CYCLONEDX_AVAILABLE=true
        log_info "CycloneDX CLI detected - will generate CycloneDX format SBOMs"
    else
        CYCLONEDX_AVAILABLE=false
        log_warning "CycloneDX CLI not found - will only generate SPDX format SBOMs"
    fi
    
    log_success "Prerequisites check completed"
}

# Create output directory structure
setup_output_directory() {
    log_info "Setting up output directory structure..."
    
    mkdir -p "$SBOM_OUTPUT_DIR"/{spdx,cyclonedx,reports,archives}
    mkdir -p "$SBOM_OUTPUT_DIR"/by-service
    mkdir -p "$SBOM_OUTPUT_DIR"/by-date/"$TIMESTAMP"
    
    log_success "Output directory structure created"
}

# Generate SBOM for a single service
generate_service_sbom() {
    local service_name=$1
    local service_path=$2
    
    log_info "Generating SBOM for service: $service_name"
    
    # Create service-specific output directory
    mkdir -p "$SBOM_OUTPUT_DIR/by-service/$service_name"
    
    # Generate SPDX format SBOM using Syft
    if [ -f "$service_path/package.json" ]; then
        # Node.js service
        log_info "Detected Node.js service: $service_name"
        
        # Generate from source code
        syft "$service_path" \
            --output spdx-json="$SBOM_OUTPUT_DIR/spdx/${service_name}-source.spdx.json" \
            --output spdx-tag="$SBOM_OUTPUT_DIR/spdx/${service_name}-source.spdx" \
            --catalogers npm-package-json,javascript-package
        
        # If Dockerfile exists, also generate from container image
        if [ -f "$service_path/Dockerfile" ]; then
            log_info "Building container image for SBOM generation: $service_name"
            
            # Build container image
            docker build -t "aiops-$service_name:sbom" "$service_path" > /dev/null 2>&1
            
            # Generate SBOM from container image
            syft "aiops-$service_name:sbom" \
                --output spdx-json="$SBOM_OUTPUT_DIR/spdx/${service_name}-container.spdx.json" \
                --output spdx-tag="$SBOM_OUTPUT_DIR/spdx/${service_name}-container.spdx"
            
            # Clean up container image
            docker rmi "aiops-$service_name:sbom" > /dev/null 2>&1 || true
        fi
        
    elif [ -f "$service_path/requirements.txt" ] || [ -f "$service_path/pyproject.toml" ]; then
        # Python service
        log_info "Detected Python service: $service_name"
        
        syft "$service_path" \
            --output spdx-json="$SBOM_OUTPUT_DIR/spdx/${service_name}-source.spdx.json" \
            --output spdx-tag="$SBOM_OUTPUT_DIR/spdx/${service_name}-source.spdx" \
            --catalogers python-package
            
        # Container image SBOM if Dockerfile exists
        if [ -f "$service_path/Dockerfile" ]; then
            docker build -t "aiops-$service_name:sbom" "$service_path" > /dev/null 2>&1
            syft "aiops-$service_name:sbom" \
                --output spdx-json="$SBOM_OUTPUT_DIR/spdx/${service_name}-container.spdx.json" \
                --output spdx-tag="$SBOM_OUTPUT_DIR/spdx/${service_name}-container.spdx"
            docker rmi "aiops-$service_name:sbom" > /dev/null 2>&1 || true
        fi
    else
        log_warning "Unknown service type for $service_name, generating generic SBOM"
        syft "$service_path" \
            --output spdx-json="$SBOM_OUTPUT_DIR/spdx/${service_name}-source.spdx.json" \
            --output spdx-tag="$SBOM_OUTPUT_DIR/spdx/${service_name}-source.spdx"
    fi
    
    # Generate CycloneDX format if available
    if [ "$CYCLONEDX_AVAILABLE" = true ] && [ -f "$service_path/package.json" ]; then
        log_info "Generating CycloneDX SBOM for $service_name"
        
        cd "$service_path"
        cyclonedx-npm --output-file "$SBOM_OUTPUT_DIR/cyclonedx/${service_name}.json" > /dev/null 2>&1 || true
        cd - > /dev/null
    fi
    
    # Copy to service-specific directory
    cp "$SBOM_OUTPUT_DIR/spdx/${service_name}"*.spdx* "$SBOM_OUTPUT_DIR/by-service/$service_name/" 2>/dev/null || true
    cp "$SBOM_OUTPUT_DIR/cyclonedx/${service_name}"*.json "$SBOM_OUTPUT_DIR/by-service/$service_name/" 2>/dev/null || true
    
    log_success "SBOM generated for service: $service_name"
}

# Generate SBOMs for all services
generate_all_service_sboms() {
    log_info "Discovering and processing all services..."
    
    # Find all services in the services directory
    if [ -d "$PROJECT_ROOT/services" ]; then
        for service_dir in "$PROJECT_ROOT/services"/*; do
            if [ -d "$service_dir" ]; then
                service_name=$(basename "$service_dir")
                generate_service_sbom "$service_name" "$service_dir"
            fi
        done
    fi
    
    # Process demo data generator
    if [ -d "$PROJECT_ROOT/demo/data-generator" ]; then
        generate_service_sbom "demo-data-generator" "$PROJECT_ROOT/demo/data-generator"
    fi
    
    log_success "All service SBOMs generated"
}

# Generate infrastructure SBOM
generate_infrastructure_sbom() {
    log_info "Generating infrastructure SBOM..."
    
    # Create infrastructure SBOM from docker-compose.yml and infrastructure files
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        # Extract container images from docker-compose.yml
        grep -E "^\s*image:" "$PROJECT_ROOT/docker-compose.yml" | \
        sed 's/.*image:\s*//' | \
        sed 's/\${.*}/latest/' | \
        sort -u > "$SBOM_OUTPUT_DIR/infrastructure-images.txt"
        
        # Generate SBOM for each infrastructure image
        while IFS= read -r image; do
            if [ -n "$image" ]; then
                image_name=$(echo "$image" | tr '/:' '_')
                log_info "Generating SBOM for infrastructure image: $image"
                
                # Pull image if not available locally
                docker pull "$image" > /dev/null 2>&1 || true
                
                # Generate SBOM
                syft "$image" \
                    --output spdx-json="$SBOM_OUTPUT_DIR/spdx/infra-${image_name}.spdx.json" \
                    --output spdx-tag="$SBOM_OUTPUT_DIR/spdx/infra-${image_name}.spdx" \
                    2>/dev/null || log_warning "Failed to generate SBOM for $image"
            fi
        done < "$SBOM_OUTPUT_DIR/infrastructure-images.txt"
        
        rm "$SBOM_OUTPUT_DIR/infrastructure-images.txt"
    fi
    
    log_success "Infrastructure SBOM generation completed"
}

# Generate consolidated SBOM report
generate_consolidated_report() {
    log_info "Generating consolidated SBOM report..."
    
    local report_file="$SBOM_OUTPUT_DIR/reports/sbom-summary-$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# Software Bill of Materials (SBOM) Report

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Platform**: AIOps Learning Platform
**Report ID**: $TIMESTAMP

## Overview

This report provides a comprehensive Software Bill of Materials (SBOM) for all components of the AIOps Learning Platform.

## Generation Details

- **SBOM Generator**: Syft $(syft version 2>/dev/null | head -n1 || echo "Unknown")
- **Formats Generated**: SPDX-JSON, SPDX-Tag
- **CycloneDX Support**: $([ "$CYCLONEDX_AVAILABLE" = true ] && echo "Enabled" || echo "Disabled")
- **Timestamp**: $TIMESTAMP

## Services Analyzed

EOF

    # List all services with SBOM files
    local service_count=0
    for service_dir in "$SBOM_OUTPUT_DIR/by-service"/*; do
        if [ -d "$service_dir" ]; then
            service_name=$(basename "$service_dir")
            sbom_count=$(find "$service_dir" -name "*.spdx*" -o -name "*.json" | wc -l)
            echo "- **$service_name**: $sbom_count SBOM files generated" >> "$report_file"
            ((service_count++))
        fi
    done
    
    cat >> "$report_file" << EOF

## File Summary

| Format | Count | Location |
|--------|-------|----------|
| SPDX JSON | $(find "$SBOM_OUTPUT_DIR/spdx" -name "*.spdx.json" | wc -l) | \`security/sbom/output/spdx/\` |
| SPDX Tag | $(find "$SBOM_OUTPUT_DIR/spdx" -name "*.spdx" | wc -l) | \`security/sbom/output/spdx/\` |
| CycloneDX | $(find "$SBOM_OUTPUT_DIR/cyclonedx" -name "*.json" 2>/dev/null | wc -l) | \`security/sbom/output/cyclonedx/\` |

## Security Considerations

- All SBOMs include complete dependency trees
- Container image SBOMs capture runtime dependencies
- Source code SBOMs capture development dependencies
- Infrastructure SBOMs include base image components

## Usage

### Vulnerability Analysis
\`\`\`bash
# Analyze SBOM for vulnerabilities using Grype
grype sbom:security/sbom/output/spdx/service-name.spdx.json
\`\`\`

### License Compliance
\`\`\`bash
# Check license compliance
syft security/sbom/output/spdx/service-name.spdx.json -o json | jq '.artifacts[].licenses'
\`\`\`

### Supply Chain Analysis
\`\`\`bash
# Analyze supply chain risks
trivy sbom security/sbom/output/spdx/service-name.spdx.json
\`\`\`

## Compliance

This SBOM generation process supports compliance with:

- **NIST 800-53 SI-7**: Software, Firmware, and Information Integrity
- **CIS Controls 2.4**: Utilize Automated Software Inventory Tools
- **OWASP SCVS**: Software Component Verification Standard
- **NTIA Minimum Elements**: All required SBOM elements included

## Next Steps

1. **Vulnerability Scanning**: Use generated SBOMs with vulnerability scanners
2. **License Review**: Analyze license compliance across all components
3. **Supply Chain Monitoring**: Set up continuous SBOM generation in CI/CD
4. **Risk Assessment**: Evaluate supply chain risks based on SBOM data

## Archive

This report and all generated SBOMs are archived in:
\`security/sbom/output/by-date/$TIMESTAMP/\`

---

*Generated by AIOps Learning Platform Security Team*
EOF

    log_success "Consolidated report generated: $report_file"
}

# Archive SBOMs with timestamp
archive_sboms() {
    log_info "Archiving SBOMs..."
    
    # Copy all generated files to timestamped archive
    cp -r "$SBOM_OUTPUT_DIR/spdx" "$SBOM_OUTPUT_DIR/by-date/$TIMESTAMP/"
    cp -r "$SBOM_OUTPUT_DIR/cyclonedx" "$SBOM_OUTPUT_DIR/by-date/$TIMESTAMP/" 2>/dev/null || true
    cp -r "$SBOM_OUTPUT_DIR/reports" "$SBOM_OUTPUT_DIR/by-date/$TIMESTAMP/"
    cp -r "$SBOM_OUTPUT_DIR/by-service" "$SBOM_OUTPUT_DIR/by-date/$TIMESTAMP/"
    
    # Create compressed archive
    cd "$SBOM_OUTPUT_DIR"
    tar -czf "archives/sbom-archive-$TIMESTAMP.tar.gz" "by-date/$TIMESTAMP"
    cd - > /dev/null
    
    log_success "SBOMs archived: sbom-archive-$TIMESTAMP.tar.gz"
}

# Generate SBOM tracking database
generate_tracking_database() {
    log_info "Generating SBOM tracking database..."
    
    local tracking_file="$SBOM_OUTPUT_DIR/sbom-tracking.json"
    
    cat > "$tracking_file" << EOF
{
  "metadata": {
    "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "generator": "AIOps SBOM Generator v1.0",
    "platform": "AIOps Learning Platform",
    "report_id": "$TIMESTAMP"
  },
  "services": [
EOF

    local first_service=true
    for service_dir in "$SBOM_OUTPUT_DIR/by-service"/*; do
        if [ -d "$service_dir" ]; then
            service_name=$(basename "$service_dir")
            
            if [ "$first_service" = false ]; then
                echo "    }," >> "$tracking_file"
            fi
            first_service=false
            
            cat >> "$tracking_file" << EOF
    {
      "name": "$service_name",
      "sbom_files": [
EOF
            
            local first_file=true
            for sbom_file in "$service_dir"/*; do
                if [ -f "$sbom_file" ]; then
                    filename=$(basename "$sbom_file")
                    file_size=$(stat -f%z "$sbom_file" 2>/dev/null || stat -c%s "$sbom_file" 2>/dev/null || echo "0")
                    file_hash=$(sha256sum "$sbom_file" | cut -d' ' -f1)
                    
                    if [ "$first_file" = false ]; then
                        echo "        }," >> "$tracking_file"
                    fi
                    first_file=false
                    
                    cat >> "$tracking_file" << EOF
        {
          "filename": "$filename",
          "size_bytes": $file_size,
          "sha256": "$file_hash",
          "format": "$(echo "$filename" | grep -q "spdx.json" && echo "SPDX-JSON" || echo "$filename" | grep -q "spdx" && echo "SPDX-Tag" || echo "CycloneDX")"
EOF
                fi
            done
            
            if [ "$first_file" = false ]; then
                echo "        }" >> "$tracking_file"
            fi
            
            echo "      ]" >> "$tracking_file"
        fi
    done
    
    if [ "$first_service" = false ]; then
        echo "    }" >> "$tracking_file"
    fi
    
    cat >> "$tracking_file" << EOF
  ],
  "statistics": {
    "total_services": $(find "$SBOM_OUTPUT_DIR/by-service" -mindepth 1 -maxdepth 1 -type d | wc -l),
    "total_sbom_files": $(find "$SBOM_OUTPUT_DIR" -name "*.spdx*" -o -name "*.json" | grep -v tracking | wc -l),
    "spdx_json_files": $(find "$SBOM_OUTPUT_DIR" -name "*.spdx.json" | wc -l),
    "spdx_tag_files": $(find "$SBOM_OUTPUT_DIR" -name "*.spdx" | wc -l),
    "cyclonedx_files": $(find "$SBOM_OUTPUT_DIR" -name "*.json" | grep -v spdx | grep -v tracking | wc -l)
  }
}
EOF

    log_success "SBOM tracking database generated: $tracking_file"
}

# Main execution
main() {
    log_info "Starting SBOM generation for AIOps Learning Platform"
    log_info "Timestamp: $TIMESTAMP"
    
    check_prerequisites
    setup_output_directory
    generate_all_service_sboms
    generate_infrastructure_sbom
    generate_consolidated_report
    generate_tracking_database
    archive_sboms
    
    log_success "SBOM generation completed successfully!"
    log_info "Results available in: $SBOM_OUTPUT_DIR"
    log_info "Archive created: sbom-archive-$TIMESTAMP.tar.gz"
    
    # Display summary
    echo
    echo "=== SBOM Generation Summary ==="
    echo "Services processed: $(find "$SBOM_OUTPUT_DIR/by-service" -mindepth 1 -maxdepth 1 -type d | wc -l)"
    echo "SBOM files generated: $(find "$SBOM_OUTPUT_DIR" -name "*.spdx*" -o -name "*.json" | grep -v tracking | wc -l)"
    echo "Output directory: $SBOM_OUTPUT_DIR"
    echo "Report: $SBOM_OUTPUT_DIR/reports/sbom-summary-$TIMESTAMP.md"
    echo "==============================="
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Generate Software Bill of Materials (SBOM) for AIOps Learning Platform"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --service NAME Generate SBOM for specific service only"
        echo "  --format FORMAT Specify output format (spdx-json, spdx-tag, cyclonedx)"
        echo
        echo "Examples:"
        echo "  $0                    # Generate SBOMs for all services"
        echo "  $0 --service user-service  # Generate SBOM for user-service only"
        echo
        exit 0
        ;;
    --service)
        if [ -z "${2:-}" ]; then
            log_error "Service name required with --service option"
            exit 1
        fi
        SERVICE_NAME="$2"
        SERVICE_PATH="$PROJECT_ROOT/services/$SERVICE_NAME"
        if [ ! -d "$SERVICE_PATH" ]; then
            log_error "Service directory not found: $SERVICE_PATH"
            exit 1
        fi
        
        log_info "Generating SBOM for single service: $SERVICE_NAME"
        check_prerequisites
        setup_output_directory
        generate_service_sbom "$SERVICE_NAME" "$SERVICE_PATH"
        log_success "SBOM generation completed for $SERVICE_NAME"
        exit 0
        ;;
    *)
        main
        ;;
esac