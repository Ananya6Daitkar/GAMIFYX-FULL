# GamifyX SBOM Security Tracking System

## Overview

The GamifyX SBOM Security Tracking System provides comprehensive Software Bill of Materials (SBOM) generation, security analysis, continuous monitoring, and compliance tracking for the GamifyX AIOps Learning Platform.

## Features

### 🔍 Advanced SBOM Security Tracking
- **Multi-format SBOM support**: CycloneDX and SPDX formats
- **Comprehensive component analysis**: Vulnerabilities, licenses, supply chain risks
- **Real-time security monitoring**: Continuous vulnerability detection and alerting
- **ML-powered risk assessment**: Intelligent risk scoring with business context
- **Threat intelligence integration**: Multiple vulnerability databases and reputation services

### 🔗 Supply Chain Security Analysis
- **Dependency graph analysis**: Visual representation of component relationships
- **Supply chain risk assessment**: Maintainer reputation, package health, trust levels
- **Circular dependency detection**: Identify and resolve architectural issues
- **Single point of failure analysis**: Critical dependency identification
- **Typosquatting detection**: Malicious package identification

### 📊 Compliance Tracking & Reporting
- **Multi-framework support**: NIST CSF, ISO 27001, SOC 2, GDPR, FERPA
- **Automated compliance assessment**: Real-time compliance scoring
- **Gap analysis and remediation**: Actionable compliance improvements
- **Evidence collection**: Automated compliance evidence gathering
- **Executive reporting**: Comprehensive compliance dashboards

### 🚨 Continuous Monitoring & Alerting
- **Real-time file system monitoring**: Automatic SBOM change detection
- **Multi-channel notifications**: Slack, email, webhooks, PagerDuty
- **Automated response actions**: Ticket creation, component blocking, system quarantine
- **Prometheus metrics integration**: Performance and security metrics
- **Grafana dashboard support**: Visual monitoring and alerting

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GamifyX SBOM Security System                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ SBOM Generator  │  │ Security Tracker│  │ Supply Chain    │ │
│  │                 │  │                 │  │ Analyzer        │ │
│  │ • CycloneDX      │  │ • Vuln Analysis │  │ • Dependency    │ │
│  │ • SPDX          │  │ • Risk Scoring  │  │   Graph         │ │
│  │ • Multi-source  │  │ • Threat Intel  │  │ • Trust Levels  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Continuous      │  │ Compliance      │  │ Reporting &     │ │
│  │ Monitoring      │  │ Tracker         │  │ Dashboards      │ │
│  │                 │  │                 │  │                 │ │
│  │ • File Watcher  │  │ • Multi-framework│  │ • Executive     │ │
│  │ • Real-time     │  │ • Automated     │  │   Reports       │ │
│  │   Alerts        │  │   Assessment    │  │ • Visualizations│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    External Integrations                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Vulnerability   │  │ Package         │  │ Monitoring &    │ │
│  │ Databases       │  │ Registries      │  │ Alerting        │ │
│  │                 │  │                 │  │                 │ │
│  │ • OSV           │  │ • npm           │  │ • Prometheus    │ │
│  │ • NVD           │  │ • PyPI          │  │ • Grafana       │ │
│  │ • GitHub        │  │ • Maven         │  │ • Slack         │ │
│  │ • Snyk          │  │ • NuGet         │  │ • PagerDuty     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Install Python dependencies
pip install -r security/sbom/requirements.txt

# Install system dependencies
sudo apt-get install -y trivy syft grype

# Configure environment variables
cp security/sbom/sbom-config.yaml.example security/sbom/sbom-config.yaml
# Edit configuration file with your settings
```

### 2. Generate SBOM

```bash
# Generate SBOM for the entire project
python security/sbom/advanced-sbom-tracker.py \
  --config security/sbom/sbom-config.yaml \
  --project-root . \
  --output-dir security/reports/sbom \
  --formats cyclonedx spdx

# Generate with vulnerability data
python security/sbom/advanced-sbom-tracker.py \
  --config security/sbom/sbom-config.yaml \
  --project-root . \
  --output-dir security/reports/sbom \
  --include-vulns \
  --include-dev
```

### 3. Security Analysis

```bash
# Perform comprehensive security analysis
python security/sbom/advanced-sbom-tracker.py \
  --config security/sbom/sbom-config.yaml \
  --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json \
  --output-dir security/reports/analysis \
  --format html \
  --dashboard

# Supply chain analysis
python security/sbom/supply-chain-analyzer.py \
  --config security/sbom/sbom-config.yaml \
  --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json \
  --output-dir security/reports/supply-chain \
  --visualization
```

### 4. Compliance Assessment

```bash
# Assess NIST Cybersecurity Framework compliance
python security/sbom/compliance-tracker.py \
  --config security/sbom/sbom-config.yaml \
  --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json \
  --framework nist_csf \
  --output-dir security/reports/compliance \
  --format html \
  --dashboard

# Assess multiple frameworks
for framework in nist_csf iso_27001 soc2 gdpr ferpa; do
  python security/sbom/compliance-tracker.py \
    --config security/sbom/sbom-config.yaml \
    --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json \
    --framework $framework \
    --output-dir security/reports/compliance
done
```

### 5. Continuous Monitoring

```bash
# Start continuous monitoring
python security/sbom/continuous-monitoring.py \
  --config security/sbom/sbom-config.yaml \
  --daemon

# Monitor specific SBOM file
python security/sbom/continuous-monitoring.py \
  --config security/sbom/sbom-config.yaml \
  --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json
```

## Configuration

### Environment Variables

```bash
# Required API keys and tokens
export GITHUB_TOKEN="your_github_token"
export NVD_API_KEY="your_nvd_api_key"
export SNYK_TOKEN="your_snyk_token"
export VIRUSTOTAL_API_KEY="your_virustotal_api_key"

# Notification webhooks
export SLACK_WEBHOOK_URL="your_slack_webhook_url"
export SECURITY_WEBHOOK_URL="your_security_webhook_url"
export WEBHOOK_TOKEN="your_webhook_token"

# Monitoring integration
export PROMETHEUS_PUSHGATEWAY_URL="http://localhost:9091"
export GRAFANA_API_URL="http://localhost:3000"
export GRAFANA_API_KEY="your_grafana_api_key"

# Ticketing integration
export JIRA_URL="your_jira_instance_url"
export JIRA_USERNAME="your_jira_username"
export JIRA_TOKEN="your_jira_token"
export PAGERDUTY_INTEGRATION_KEY="your_pagerduty_key"
```

### Configuration File

The main configuration is in `security/sbom/sbom-config.yaml`. Key sections:

- **Project Information**: Basic project metadata
- **SBOM Generation**: Component discovery and SBOM creation settings
- **Security Tracking**: Vulnerability sources and risk assessment
- **Continuous Monitoring**: File watching and alerting configuration
- **Supply Chain Analysis**: Dependency analysis and trust evaluation
- **Compliance Tracking**: Framework requirements and assessment settings
- **Integrations**: External tool and service configurations

## API Reference

### SBOM Generator API

```python
from security.sbom.advanced_sbom_tracker import SBOMSecurityTracker

# Initialize tracker
tracker = SBOMSecurityTracker('security/sbom/sbom-config.yaml')

# Generate SBOM with security analysis
report = await tracker.track_sbom_security('path/to/sbom.json')

# Export report
tracker.export_security_report(report, 'output.html', 'html')
```

### Supply Chain Analyzer API

```python
from security.sbom.supply_chain_analyzer import SupplyChainAnalyzer

# Initialize analyzer
analyzer = SupplyChainAnalyzer('security/sbom/sbom-config.yaml')

# Analyze supply chain
analysis = await analyzer.analyze_supply_chain(sbom_data)

# Generate visualization
analyzer.generate_supply_chain_visualization(analysis, 'supply-chain.html')
```

### Compliance Tracker API

```python
from security.sbom.compliance_tracker import ComplianceTracker, ComplianceFramework

# Initialize tracker
tracker = ComplianceTracker('security/sbom/sbom-config.yaml')

# Assess compliance
report = tracker.assess_compliance(sbom_data, ComplianceFramework.NIST_CSF)

# Export report
tracker.export_compliance_report(report, 'compliance.html', 'html')
```

### Continuous Monitoring API

```python
from security.sbom.continuous_monitoring import ContinuousMonitor

# Initialize monitor
monitor = ContinuousMonitor('security/sbom/sbom-config.yaml')

# Start monitoring
await monitor.start_monitoring()

# Process SBOM change
await monitor.process_sbom_change('path/to/sbom.json')
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: SBOM Security Analysis
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  sbom-security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r security/sbom/requirements.txt
    
    - name: Generate SBOM
      run: |
        python security/sbom/advanced-sbom-tracker.py \
          --config security/sbom/sbom-config.yaml \
          --project-root . \
          --output-dir security/reports/sbom
    
    - name: Security Analysis
      run: |
        python security/sbom/advanced-sbom-tracker.py \
          --config security/sbom/sbom-config.yaml \
          --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json \
          --output-dir security/reports/analysis
    
    - name: Compliance Assessment
      run: |
        python security/sbom/compliance-tracker.py \
          --config security/sbom/sbom-config.yaml \
          --sbom-file security/reports/sbom/gamifyx-sbom.cyclonedx.json \
          --framework nist_csf \
          --output-dir security/reports/compliance
    
    - name: Upload Reports
      uses: actions/upload-artifact@v3
      with:
        name: sbom-security-reports
        path: security/reports/
```

### Docker Integration

```dockerfile
# Add to your Dockerfile
FROM python:3.11-slim

# Install SBOM tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Install Syft
RUN curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Copy SBOM security tools
COPY security/sbom/ /app/security/sbom/
RUN pip install -r /app/security/sbom/requirements.txt

# Set up monitoring
EXPOSE 8000
CMD ["python", "/app/security/sbom/continuous-monitoring.py", "--config", "/app/security/sbom/sbom-config.yaml", "--daemon"]
```

## Monitoring and Alerting

### Prometheus Metrics

The system exposes the following Prometheus metrics:

- `sbom_scans_total`: Total number of SBOM scans performed
- `vulnerabilities_detected_total`: Total vulnerabilities detected by severity
- `security_alerts_total`: Total security alerts generated
- `sbom_scan_duration_seconds`: Time taken for SBOM security scans
- `sbom_risk_score`: Current SBOM risk score
- `sbom_component_count`: Number of components by status
- `compliance_score`: Compliance scores by framework

### Grafana Dashboards

Pre-built Grafana dashboards are available in `monitoring/grafana/dashboards/sbom/`:

- **SBOM Security Overview**: Executive dashboard with key metrics
- **Vulnerability Trends**: Vulnerability detection and remediation trends
- **Supply Chain Health**: Supply chain risk and trust metrics
- **Compliance Status**: Multi-framework compliance tracking
- **Component Inventory**: Detailed component analysis and tracking

### Alert Rules

Example Prometheus alert rules:

```yaml
groups:
- name: sbom-security
  rules:
  - alert: CriticalVulnerabilityDetected
    expr: vulnerabilities_detected_total{severity="critical"} > 0
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "Critical vulnerability detected in SBOM"
      description: "{{ $value }} critical vulnerabilities detected"

  - alert: ComplianceScoreLow
    expr: compliance_score < 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Compliance score below threshold"
      description: "{{ $labels.framework }} compliance score is {{ $value }}"

  - alert: HighRiskScore
    expr: sbom_risk_score > 7.0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "SBOM risk score is high"
      description: "Current risk score is {{ $value }}/10"
```

## Troubleshooting

### Common Issues

1. **API Rate Limiting**
   - Configure appropriate rate limits in `sbom-config.yaml`
   - Use API keys where available to increase limits
   - Implement exponential backoff for retries

2. **Database Locks**
   - Ensure only one monitoring process is running
   - Check for long-running transactions
   - Consider using connection pooling

3. **Memory Usage**
   - Adjust `max_memory_mb` in configuration
   - Enable garbage collection thresholds
   - Process large SBOMs in batches

4. **Network Connectivity**
   - Verify external API endpoints are accessible
   - Check firewall and proxy settings
   - Test with curl or wget

### Debug Mode

Enable debug logging:

```bash
# Set debug level in configuration
logging:
  level: "DEBUG"

# Or use environment variable
export SBOM_LOG_LEVEL=DEBUG

# Run with verbose output
python security/sbom/advanced-sbom-tracker.py --debug
```

### Performance Tuning

```yaml
# Optimize for large SBOMs
performance:
  max_workers: 20
  batch_size: 100
  timeout_seconds: 600
  
  cache_enabled: true
  cache_ttl_seconds: 7200
  cache_size_mb: 500
  
  max_memory_mb: 2048
  gc_threshold: 0.7
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/gamifyx/platform.git
cd platform

# Install development dependencies
pip install -r security/sbom/requirements-dev.txt

# Run tests
pytest security/sbom/tests/

# Run linting
flake8 security/sbom/
black security/sbom/
mypy security/sbom/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- 📧 Email: security@gamifyx.com
- 💬 Slack: #security-team
- 🐛 Issues: [GitHub Issues](https://github.com/gamifyx/platform/issues)
- 📖 Documentation: [Wiki](https://github.com/gamifyx/platform/wiki)

## Changelog

### v1.0.0 (2024-10-21)
- Initial release
- Advanced SBOM security tracking
- Supply chain analysis
- Compliance tracking for 5 frameworks
- Continuous monitoring and alerting
- Multi-format reporting and dashboards