#!/usr/bin/env python3
"""
compliance-tracker.py - SBOM compliance tracking and reporting system
Tracks compliance with various security frameworks and generates compliance reports
"""

import json
import yaml
import sqlite3
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import pandas as pd
import numpy as np
from jinja2 import Template
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComplianceStatus(Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIALLY_COMPLIANT = "partially_compliant"
    NOT_APPLICABLE = "not_applicable"
    UNKNOWN = "unknown"

class ComplianceFramework(Enum):
    NIST_CSF = "nist_csf"
    ISO_27001 = "iso_27001"
    SOC2 = "soc2"
    GDPR = "gdpr"
    FERPA = "ferpa"
    PCI_DSS = "pci_dss"
    HIPAA = "hipaa"
    SOX = "sox"
    FISMA = "fisma"
    COBIT = "cobit"

@dataclass
class ComplianceRequirement:
    """Individual compliance requirement"""
    id: str
    framework: ComplianceFramework
    category: str
    subcategory: str
    title: str
    description: str
    control_objective: str
    implementation_guidance: str
    testing_procedures: List[str]
    evidence_requirements: List[str]
    automation_possible: bool
    risk_level: str
    mandatory: bool

@dataclass
class ComplianceAssessment:
    """Assessment of a compliance requirement"""
    requirement_id: str
    status: ComplianceStatus
    score: float  # 0-100
    evidence: List[str]
    gaps: List[str]
    recommendations: List[str]
    last_assessed: datetime
    next_assessment: datetime
    assessor: str
    notes: str
    automated: bool

@dataclass
class ComplianceReport:
    """Comprehensive compliance report"""
    report_id: str
    timestamp: datetime
    framework: ComplianceFramework
    overall_score: float
    total_requirements: int
    compliant_requirements: int
    non_compliant_requirements: int
    partially_compliant_requirements: int
    not_applicable_requirements: int
    unknown_requirements: int
    critical_gaps: List[str]
    recommendations: List[str]
    assessments: List[ComplianceAssessment]
    sbom_analysis: Dict[str, Any]
    risk_assessment: Dict[str, Any]

class ComplianceTracker:
    """SBOM compliance tracking and reporting system"""
    
    def __init__(self, config_file: str):
        self.config = self._load_config(config_file)
        self.db_path = Path(self.config.get('database_path', 'security/sbom/compliance.db'))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        
        # Load compliance frameworks
        self.frameworks = self._load_compliance_frameworks()
        
        # Initialize SBOM analyzers
        self.sbom_analyzers = {
            'security': self._analyze_security_compliance,
            'licensing': self._analyze_license_compliance,
            'supply_chain': self._analyze_supply_chain_compliance,
            'data_protection': self._analyze_data_protection_compliance,
            'operational': self._analyze_operational_compliance
        }
    
    def _load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            return yaml.safe_load(f)
    
    def _init_database(self):
        """Initialize compliance tracking database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS compliance_frameworks (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    version TEXT,
                    description TEXT,
                    requirements_data TEXT,
                    last_updated DATETIME
                );
                
                CREATE TABLE IF NOT EXISTS compliance_assessments (
                    id TEXT PRIMARY KEY,
                    requirement_id TEXT,
                    framework TEXT,
                    status TEXT,
                    score REAL,
                    evidence TEXT,
                    gaps TEXT,
                    recommendations TEXT,
                    last_assessed DATETIME,
                    next_assessment DATETIME,
                    assessor TEXT,
                    notes TEXT,
                    automated BOOLEAN
                );
                
                CREATE TABLE IF NOT EXISTS compliance_reports (
                    id TEXT PRIMARY KEY,
                    timestamp DATETIME,
                    framework TEXT,
                    overall_score REAL,
                    total_requirements INTEGER,
                    compliant_requirements INTEGER,
                    non_compliant_requirements INTEGER,
                    partially_compliant_requirements INTEGER,
                    not_applicable_requirements INTEGER,
                    unknown_requirements INTEGER,
                    critical_gaps TEXT,
                    recommendations TEXT,
                    sbom_analysis TEXT,
                    risk_assessment TEXT
                );
                
                CREATE TABLE IF NOT EXISTS compliance_evidence (
                    id TEXT PRIMARY KEY,
                    assessment_id TEXT,
                    evidence_type TEXT,
                    evidence_data TEXT,
                    collected_date DATETIME,
                    expiry_date DATETIME,
                    automated BOOLEAN,
                    FOREIGN KEY (assessment_id) REFERENCES compliance_assessments (id)
                );
                
                CREATE TABLE IF NOT EXISTS compliance_remediation (
                    id TEXT PRIMARY KEY,
                    assessment_id TEXT,
                    gap_description TEXT,
                    remediation_plan TEXT,
                    priority TEXT,
                    assigned_to TEXT,
                    due_date DATETIME,
                    status TEXT,
                    completion_date DATETIME,
                    FOREIGN KEY (assessment_id) REFERENCES compliance_assessments (id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_assessments_framework ON compliance_assessments(framework);
                CREATE INDEX IF NOT EXISTS idx_reports_framework ON compliance_reports(framework);
                CREATE INDEX IF NOT EXISTS idx_evidence_assessment ON compliance_evidence(assessment_id);
                CREATE INDEX IF NOT EXISTS idx_remediation_assessment ON compliance_remediation(assessment_id);
            """)
    
    def _load_compliance_frameworks(self) -> Dict[ComplianceFramework, List[ComplianceRequirement]]:
        """Load compliance framework requirements"""
        frameworks = {}
        
        # Load NIST Cybersecurity Framework
        frameworks[ComplianceFramework.NIST_CSF] = self._load_nist_csf_requirements()
        
        # Load ISO 27001
        frameworks[ComplianceFramework.ISO_27001] = self._load_iso27001_requirements()
        
        # Load SOC 2
        frameworks[ComplianceFramework.SOC2] = self._load_soc2_requirements()
        
        # Load GDPR
        frameworks[ComplianceFramework.GDPR] = self._load_gdpr_requirements()
        
        # Load FERPA
        frameworks[ComplianceFramework.FERPA] = self._load_ferpa_requirements()
        
        return frameworks
    
    def assess_compliance(self, sbom_data: Dict[str, Any], framework: ComplianceFramework) -> ComplianceReport:
        """Assess compliance against a specific framework"""
        logger.info(f"Assessing compliance against {framework.value}")
        
        report_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)
        
        # Get framework requirements
        requirements = self.frameworks.get(framework, [])
        
        # Perform assessments
        assessments = []
        for requirement in requirements:
            assessment = self._assess_requirement(requirement, sbom_data)
            assessments.append(assessment)
        
        # Calculate overall compliance metrics
        metrics = self._calculate_compliance_metrics(assessments)
        
        # Analyze SBOM for compliance-specific issues
        sbom_analysis = self._analyze_sbom_compliance(sbom_data, framework)
        
        # Perform risk assessment
        risk_assessment = self._perform_compliance_risk_assessment(assessments, sbom_analysis)
        
        # Generate recommendations
        recommendations = self._generate_compliance_recommendations(assessments, sbom_analysis, framework)
        
        # Identify critical gaps
        critical_gaps = self._identify_critical_gaps(assessments)
        
        # Create compliance report
        report = ComplianceReport(
            report_id=report_id,
            timestamp=timestamp,
            framework=framework,
            overall_score=metrics['overall_score'],
            total_requirements=metrics['total_requirements'],
            compliant_requirements=metrics['compliant_requirements'],
            non_compliant_requirements=metrics['non_compliant_requirements'],
            partially_compliant_requirements=metrics['partially_compliant_requirements'],
            not_applicable_requirements=metrics['not_applicable_requirements'],
            unknown_requirements=metrics['unknown_requirements'],
            critical_gaps=critical_gaps,
            recommendations=recommendations,
            assessments=assessments,
            sbom_analysis=sbom_analysis,
            risk_assessment=risk_assessment
        )
        
        # Store report
        self._store_compliance_report(report)
        
        logger.info(f"Compliance assessment completed. Overall score: {report.overall_score:.1f}%")
        return report
    
    def _assess_requirement(self, requirement: ComplianceRequirement, sbom_data: Dict[str, Any]) -> ComplianceAssessment:
        """Assess a single compliance requirement"""
        assessment_id = str(uuid.uuid4())
        
        # Determine if assessment can be automated
        automated = requirement.automation_possible
        
        if automated:
            # Perform automated assessment
            status, score, evidence, gaps = self._automated_assessment(requirement, sbom_data)
        else:
            # Manual assessment required
            status = ComplianceStatus.UNKNOWN
            score = 0.0
            evidence = []
            gaps = ["Manual assessment required"]
        
        # Generate recommendations
        recommendations = self._generate_requirement_recommendations(requirement, status, gaps)
        
        # Calculate next assessment date
        next_assessment = self._calculate_next_assessment_date(requirement, status)
        
        return ComplianceAssessment(
            requirement_id=requirement.id,
            status=status,
            score=score,
            evidence=evidence,
            gaps=gaps,
            recommendations=recommendations,
            last_assessed=datetime.now(timezone.utc),
            next_assessment=next_assessment,
            assessor="Automated SBOM Analyzer" if automated else "Manual Review Required",
            notes="",
            automated=automated
        )
    
    def _automated_assessment(self, requirement: ComplianceRequirement, sbom_data: Dict[str, Any]) -> Tuple[ComplianceStatus, float, List[str], List[str]]:
        """Perform automated assessment of a requirement"""
        evidence = []
        gaps = []
        score = 0.0
        
        # Route to appropriate analyzer based on requirement category
        if requirement.category.lower() in ['vulnerability', 'security']:
            status, score, evidence, gaps = self._assess_security_requirement(requirement, sbom_data)
        elif requirement.category.lower() in ['license', 'licensing']:
            status, score, evidence, gaps = self._assess_license_requirement(requirement, sbom_data)
        elif requirement.category.lower() in ['supply_chain', 'provenance']:
            status, score, evidence, gaps = self._assess_supply_chain_requirement(requirement, sbom_data)
        elif requirement.category.lower() in ['data_protection', 'privacy']:
            status, score, evidence, gaps = self._assess_data_protection_requirement(requirement, sbom_data)
        else:
            # Default assessment
            status = ComplianceStatus.UNKNOWN
            gaps = ["Automated assessment not implemented for this requirement type"]
        
        return status, score, evidence, gaps
    
    def _assess_security_requirement(self, requirement: ComplianceRequirement, sbom_data: Dict[str, Any]) -> Tuple[ComplianceStatus, float, List[str], List[str]]:
        """Assess security-related compliance requirements"""
        evidence = []
        gaps = []
        score = 0.0
        
        # Extract components and vulnerabilities
        components = self._extract_components(sbom_data)
        vulnerabilities = self._extract_vulnerabilities(sbom_data)
        
        if requirement.id == "NIST_PR_IP_12":  # Vulnerability management plan
            if vulnerabilities:
                # Check if vulnerabilities are documented
                evidence.append(f"SBOM contains {len(vulnerabilities)} documented vulnerabilities")
                score += 50.0
                
                # Check for critical vulnerabilities
                critical_vulns = [v for v in vulnerabilities if v.get('severity') == 'CRITICAL']
                if critical_vulns:
                    gaps.append(f"{len(critical_vulns)} critical vulnerabilities require immediate attention")
                    score -= 20.0
                else:
                    evidence.append("No critical vulnerabilities detected")
                    score += 25.0
                
                # Check for vulnerability tracking
                if any(v.get('id') for v in vulnerabilities):
                    evidence.append("Vulnerabilities have tracking identifiers")
                    score += 25.0
                else:
                    gaps.append("Vulnerabilities lack proper tracking identifiers")
            else:
                evidence.append("No vulnerabilities documented in SBOM")
                score = 100.0
        
        elif requirement.id == "NIST_DE_CM_8":  # Vulnerability scans performed
            if sbom_data.get('metadata', {}).get('tools'):
                tools = sbom_data['metadata']['tools']
                scanner_tools = [t for t in tools if 'scan' in t.get('name', '').lower()]
                if scanner_tools:
                    evidence.append(f"SBOM generated using vulnerability scanning tools: {[t['name'] for t in scanner_tools]}")
                    score = 100.0
                else:
                    gaps.append("No vulnerability scanning tools detected in SBOM generation")
                    score = 0.0
            else:
                gaps.append("SBOM metadata does not indicate vulnerability scanning")
                score = 0.0
        
        # Determine overall status
        if score >= 90.0:
            status = ComplianceStatus.COMPLIANT
        elif score >= 70.0:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        elif score > 0.0:
            status = ComplianceStatus.NON_COMPLIANT
        else:
            status = ComplianceStatus.UNKNOWN
        
        return status, score, evidence, gaps
    
    def _assess_license_requirement(self, requirement: ComplianceRequirement, sbom_data: Dict[str, Any]) -> Tuple[ComplianceStatus, float, List[str], List[str]]:
        """Assess license-related compliance requirements"""
        evidence = []
        gaps = []
        score = 0.0
        
        components = self._extract_components(sbom_data)
        
        # Check license documentation
        licensed_components = [c for c in components if c.get('licenses')]
        if licensed_components:
            license_coverage = len(licensed_components) / len(components) * 100
            evidence.append(f"License information available for {license_coverage:.1f}% of components")
            score += min(license_coverage, 50.0)
        else:
            gaps.append("No license information found in SBOM")
        
        # Check for problematic licenses
        problematic_licenses = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0']
        components_with_problematic_licenses = []
        
        for component in licensed_components:
            for license_info in component.get('licenses', []):
                license_name = license_info.get('license', {}).get('name', '') if isinstance(license_info, dict) else str(license_info)
                if license_name in problematic_licenses:
                    components_with_problematic_licenses.append(f"{component['name']} ({license_name})")
        
        if components_with_problematic_licenses:
            gaps.append(f"Components with potentially problematic licenses: {', '.join(components_with_problematic_licenses[:5])}")
            score -= 20.0
        else:
            evidence.append("No components with known problematic licenses detected")
            score += 25.0
        
        # Check for unknown licenses
        unlicensed_components = [c for c in components if not c.get('licenses')]
        if unlicensed_components:
            gaps.append(f"{len(unlicensed_components)} components without license information")
            score -= 25.0
        else:
            evidence.append("All components have license information")
            score += 25.0
        
        # Determine status
        if score >= 90.0:
            status = ComplianceStatus.COMPLIANT
        elif score >= 70.0:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        elif score > 0.0:
            status = ComplianceStatus.NON_COMPLIANT
        else:
            status = ComplianceStatus.UNKNOWN
        
        return status, score, evidence, gaps
    
    def _assess_supply_chain_requirement(self, requirement: ComplianceRequirement, sbom_data: Dict[str, Any]) -> Tuple[ComplianceStatus, float, List[str], List[str]]:
        """Assess supply chain-related compliance requirements"""
        evidence = []
        gaps = []
        score = 0.0
        
        components = self._extract_components(sbom_data)
        
        # Check for component provenance information
        components_with_purl = [c for c in components if c.get('purl')]
        if components_with_purl:
            provenance_coverage = len(components_with_purl) / len(components) * 100
            evidence.append(f"Provenance information (PURL) available for {provenance_coverage:.1f}% of components")
            score += min(provenance_coverage * 0.4, 40.0)
        else:
            gaps.append("No component provenance information (PURL) found")
        
        # Check for component hashes
        components_with_hashes = [c for c in components if c.get('hashes')]
        if components_with_hashes:
            hash_coverage = len(components_with_hashes) / len(components) * 100
            evidence.append(f"Integrity hashes available for {hash_coverage:.1f}% of components")
            score += min(hash_coverage * 0.3, 30.0)
        else:
            gaps.append("No component integrity hashes found")
        
        # Check SBOM generation metadata
        metadata = sbom_data.get('metadata', {})
        if metadata.get('timestamp'):
            evidence.append(f"SBOM generation timestamp: {metadata['timestamp']}")
            score += 10.0
        else:
            gaps.append("SBOM lacks generation timestamp")
        
        if metadata.get('tools'):
            evidence.append(f"SBOM generated using documented tools: {[t.get('name') for t in metadata['tools']]}")
            score += 10.0
        else:
            gaps.append("SBOM generation tools not documented")
        
        # Check for supplier information
        suppliers = set()
        for component in components:
            purl = component.get('purl', '')
            if purl:
                # Extract supplier from PURL
                if 'pkg:npm/' in purl:
                    suppliers.add('npm')
                elif 'pkg:pypi/' in purl:
                    suppliers.add('pypi')
                # Add more package managers as needed
        
        if suppliers:
            evidence.append(f"Components sourced from {len(suppliers)} suppliers: {', '.join(suppliers)}")
            score += 10.0
        else:
            gaps.append("No supplier information available")
        
        # Determine status
        if score >= 90.0:
            status = ComplianceStatus.COMPLIANT
        elif score >= 70.0:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        elif score > 0.0:
            status = ComplianceStatus.NON_COMPLIANT
        else:
            status = ComplianceStatus.UNKNOWN
        
        return status, score, evidence, gaps
    
    def _assess_data_protection_requirement(self, requirement: ComplianceRequirement, sbom_data: Dict[str, Any]) -> Tuple[ComplianceStatus, float, List[str], List[str]]:
        """Assess data protection-related compliance requirements"""
        evidence = []
        gaps = []
        score = 0.0
        
        components = self._extract_components(sbom_data)
        
        # Check for data processing components
        data_processing_keywords = ['database', 'analytics', 'tracking', 'logging', 'monitoring']
        data_components = []
        
        for component in components:
            name = component.get('name', '').lower()
            description = component.get('description', '').lower()
            
            if any(keyword in name or keyword in description for keyword in data_processing_keywords):
                data_components.append(component['name'])
        
        if data_components:
            evidence.append(f"Identified {len(data_components)} potential data processing components")
            score += 30.0
            
            # Check if these components have privacy-related metadata
            privacy_aware_components = []
            for component in components:
                if component.get('name') in data_components:
                    # Check for privacy-related properties
                    properties = component.get('properties', [])
                    privacy_props = [p for p in properties if 'privacy' in p.get('name', '').lower() or 'gdpr' in p.get('name', '').lower()]
                    if privacy_props:
                        privacy_aware_components.append(component['name'])
            
            if privacy_aware_components:
                evidence.append(f"Privacy metadata found for components: {', '.join(privacy_aware_components)}")
                score += 40.0
            else:
                gaps.append("Data processing components lack privacy metadata")
        else:
            evidence.append("No obvious data processing components identified")
            score += 50.0  # Not applicable, so give partial credit
        
        # Check for encryption-related components
        crypto_keywords = ['crypto', 'encrypt', 'ssl', 'tls', 'hash']
        crypto_components = []
        
        for component in components:
            name = component.get('name', '').lower()
            if any(keyword in name for keyword in crypto_keywords):
                crypto_components.append(component['name'])
        
        if crypto_components:
            evidence.append(f"Encryption/security components identified: {', '.join(crypto_components[:5])}")
            score += 30.0
        else:
            gaps.append("No encryption/security components identified")
        
        # Determine status
        if score >= 90.0:
            status = ComplianceStatus.COMPLIANT
        elif score >= 70.0:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        elif score > 0.0:
            status = ComplianceStatus.NON_COMPLIANT
        else:
            status = ComplianceStatus.UNKNOWN
        
        return status, score, evidence, gaps
    
    def generate_compliance_dashboard(self, reports: List[ComplianceReport], output_file: str):
        """Generate comprehensive compliance dashboard"""
        # Create subplots
        fig = make_subplots(
            rows=3, cols=2,
            subplot_titles=[
                'Compliance Scores by Framework',
                'Compliance Status Distribution',
                'Compliance Trends Over Time',
                'Critical Gaps by Framework',
                'Risk Assessment',
                'Remediation Priority'
            ],
            specs=[
                [{"type": "bar"}, {"type": "pie"}],
                [{"type": "scatter"}, {"type": "bar"}],
                [{"type": "bar"}, {"type": "bar"}]
            ]
        )
        
        # 1. Compliance Scores by Framework
        frameworks = [report.framework.value for report in reports]
        scores = [report.overall_score for report in reports]
        
        fig.add_trace(
            go.Bar(x=frameworks, y=scores, name="Compliance Score"),
            row=1, col=1
        )
        
        # 2. Compliance Status Distribution (using latest report)
        if reports:
            latest_report = max(reports, key=lambda r: r.timestamp)
            labels = ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Applicable', 'Unknown']
            values = [
                latest_report.compliant_requirements,
                latest_report.partially_compliant_requirements,
                latest_report.non_compliant_requirements,
                latest_report.not_applicable_requirements,
                latest_report.unknown_requirements
            ]
            
            fig.add_trace(
                go.Pie(labels=labels, values=values, name="Status Distribution"),
                row=1, col=2
            )
        
        # 3. Compliance Trends (mock data for demonstration)
        dates = pd.date_range(start='2024-01-01', periods=12, freq='M')
        trend_scores = np.random.normal(85, 5, 12)  # Mock trend data
        
        fig.add_trace(
            go.Scatter(x=dates, y=trend_scores, mode='lines+markers', name="Compliance Trend"),
            row=2, col=1
        )
        
        # 4. Critical Gaps by Framework
        gap_counts = [len(report.critical_gaps) for report in reports]
        
        fig.add_trace(
            go.Bar(x=frameworks, y=gap_counts, name="Critical Gaps"),
            row=2, col=2
        )
        
        # 5. Risk Assessment (mock data)
        risk_categories = ['High', 'Medium', 'Low']
        risk_counts = [5, 12, 8]  # Mock data
        
        fig.add_trace(
            go.Bar(x=risk_categories, y=risk_counts, name="Risk Distribution"),
            row=3, col=1
        )
        
        # 6. Remediation Priority (mock data)
        priority_categories = ['Critical', 'High', 'Medium', 'Low']
        priority_counts = [3, 8, 15, 10]  # Mock data
        
        fig.add_trace(
            go.Bar(x=priority_categories, y=priority_counts, name="Remediation Priority"),
            row=3, col=2
        )
        
        # Update layout
        fig.update_layout(
            title_text="SBOM Compliance Dashboard",
            showlegend=False,
            height=1000,
            width=1200
        )
        
        # Save dashboard
        fig.write_html(output_file)
        logger.info(f"Compliance dashboard saved to {output_file}")
    
    def export_compliance_report(self, report: ComplianceReport, output_file: str, format: str = 'json'):
        """Export compliance report in various formats"""
        if format.lower() == 'json':
            with open(output_file, 'w') as f:
                json.dump(asdict(report), f, indent=2, default=str)
        
        elif format.lower() == 'html':
            self._export_html_compliance_report(report, output_file)
        
        elif format.lower() == 'csv':
            self._export_csv_compliance_report(report, output_file)
        
        logger.info(f"Compliance report exported to {output_file}")
    
    def _export_html_compliance_report(self, report: ComplianceReport, output_file: str):
        """Export compliance report as HTML"""
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>SBOM Compliance Report - {{ report.framework.value.upper() }}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { background-color: #2c3e50; color: white; padding: 20px; }
                .summary { background-color: #ecf0f1; padding: 15px; margin: 20px 0; }
                .compliant { color: #27ae60; font-weight: bold; }
                .non-compliant { color: #e74c3c; font-weight: bold; }
                .partial { color: #f39c12; font-weight: bold; }
                .unknown { color: #95a5a6; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #34495e; color: white; }
                .gaps { background-color: #fff3cd; padding: 15px; margin: 20px 0; }
                .recommendations { background-color: #d1ecf1; padding: 15px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SBOM Compliance Report</h1>
                <p>Framework: {{ report.framework.value.upper() }}</p>
                <p>Generated: {{ report.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC') }}</p>
                <p>Report ID: {{ report.report_id }}</p>
            </div>
            
            <div class="summary">
                <h2>Executive Summary</h2>
                <p><strong>Overall Compliance Score:</strong> {{ "%.1f"|format(report.overall_score) }}%</p>
                <p><strong>Total Requirements:</strong> {{ report.total_requirements }}</p>
                <p><strong>Compliance Status:</strong></p>
                <ul>
                    <li class="compliant">Compliant: {{ report.compliant_requirements }}</li>
                    <li class="partial">Partially Compliant: {{ report.partially_compliant_requirements }}</li>
                    <li class="non-compliant">Non-Compliant: {{ report.non_compliant_requirements }}</li>
                    <li class="unknown">Unknown: {{ report.unknown_requirements }}</li>
                    <li>Not Applicable: {{ report.not_applicable_requirements }}</li>
                </ul>
            </div>
            
            {% if report.critical_gaps %}
            <div class="gaps">
                <h2>Critical Gaps</h2>
                <ul>
                {% for gap in report.critical_gaps %}
                    <li>{{ gap }}</li>
                {% endfor %}
                </ul>
            </div>
            {% endif %}
            
            <div class="recommendations">
                <h2>Recommendations</h2>
                <ul>
                {% for rec in report.recommendations %}
                    <li>{{ rec }}</li>
                {% endfor %}
                </ul>
            </div>
            
            <h2>Detailed Assessment Results</h2>
            <table>
                <tr>
                    <th>Requirement ID</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Evidence Count</th>
                    <th>Gaps Count</th>
                    <th>Last Assessed</th>
                    <th>Automated</th>
                </tr>
                {% for assessment in report.assessments %}
                <tr>
                    <td>{{ assessment.requirement_id }}</td>
                    <td class="{{ assessment.status.value }}">{{ assessment.status.value.replace('_', ' ').title() }}</td>
                    <td>{{ "%.1f"|format(assessment.score) }}%</td>
                    <td>{{ assessment.evidence|length }}</td>
                    <td>{{ assessment.gaps|length }}</td>
                    <td>{{ assessment.last_assessed.strftime('%Y-%m-%d') }}</td>
                    <td>{{ 'Yes' if assessment.automated else 'No' }}</td>
                </tr>
                {% endfor %}
            </table>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(report=report)
        
        with open(output_file, 'w') as f:
            f.write(html_content)
    
    # Framework-specific requirement loaders
    def _load_nist_csf_requirements(self) -> List[ComplianceRequirement]:
        """Load NIST Cybersecurity Framework requirements"""
        return [
            ComplianceRequirement(
                id="NIST_PR_IP_12",
                framework=ComplianceFramework.NIST_CSF,
                category="Protect",
                subcategory="Information Protection Processes and Procedures",
                title="Vulnerability Management Plan",
                description="A vulnerability management plan is developed and implemented",
                control_objective="Establish and maintain a vulnerability management process",
                implementation_guidance="Document vulnerabilities in SBOM and track remediation",
                testing_procedures=["Review SBOM for vulnerability documentation", "Verify vulnerability tracking"],
                evidence_requirements=["SBOM with vulnerability data", "Vulnerability tracking records"],
                automation_possible=True,
                risk_level="High",
                mandatory=True
            ),
            ComplianceRequirement(
                id="NIST_DE_CM_8",
                framework=ComplianceFramework.NIST_CSF,
                category="Detect",
                subcategory="Security Continuous Monitoring",
                title="Vulnerability Scans",
                description="Vulnerability scans are performed",
                control_objective="Regularly scan for vulnerabilities in software components",
                implementation_guidance="Use automated tools to scan SBOM components for vulnerabilities",
                testing_procedures=["Verify scanning tools are used", "Review scan results in SBOM"],
                evidence_requirements=["SBOM generation tool metadata", "Vulnerability scan results"],
                automation_possible=True,
                risk_level="High",
                mandatory=True
            )
        ]
    
    def _load_iso27001_requirements(self) -> List[ComplianceRequirement]:
        """Load ISO 27001 requirements"""
        return [
            ComplianceRequirement(
                id="ISO_A_12_6",
                framework=ComplianceFramework.ISO_27001,
                category="Operations Security",
                subcategory="Management of Technical Vulnerabilities",
                title="Technical Vulnerability Management",
                description="Information about technical vulnerabilities shall be obtained and managed",
                control_objective="Manage technical vulnerabilities in software components",
                implementation_guidance="Maintain SBOM with vulnerability information and remediation tracking",
                testing_procedures=["Review SBOM vulnerability data", "Verify remediation processes"],
                evidence_requirements=["SBOM with vulnerability information", "Remediation records"],
                automation_possible=True,
                risk_level="High",
                mandatory=True
            )
        ]
    
    def _load_soc2_requirements(self) -> List[ComplianceRequirement]:
        """Load SOC 2 requirements"""
        return [
            ComplianceRequirement(
                id="SOC2_CC6_6",
                framework=ComplianceFramework.SOC2,
                category="Common Criteria",
                subcategory="Logical and Physical Access Controls",
                title="Vulnerability Management",
                description="Vulnerabilities are identified and remediated timely",
                control_objective="Identify and remediate vulnerabilities in software components",
                implementation_guidance="Use SBOM to track component vulnerabilities and remediation status",
                testing_procedures=["Review vulnerability identification process", "Test remediation timeliness"],
                evidence_requirements=["SBOM vulnerability data", "Remediation tracking records"],
                automation_possible=True,
                risk_level="High",
                mandatory=True
            )
        ]
    
    def _load_gdpr_requirements(self) -> List[ComplianceRequirement]:
        """Load GDPR requirements"""
        return [
            ComplianceRequirement(
                id="GDPR_ART_32",
                framework=ComplianceFramework.GDPR,
                category="Security of Processing",
                subcategory="Technical and Organizational Measures",
                title="Security of Processing",
                description="Implement appropriate technical and organizational measures",
                control_objective="Ensure security of personal data processing systems",
                implementation_guidance="Document security measures in SBOM components that process personal data",
                testing_procedures=["Review SBOM for data processing components", "Verify security measures"],
                evidence_requirements=["SBOM with data processing component identification", "Security measure documentation"],
                automation_possible=True,
                risk_level="Critical",
                mandatory=True
            )
        ]
    
    def _load_ferpa_requirements(self) -> List[ComplianceRequirement]:
        """Load FERPA requirements"""
        return [
            ComplianceRequirement(
                id="FERPA_99_31",
                framework=ComplianceFramework.FERPA,
                category="Educational Records",
                subcategory="Disclosure Limitations",
                title="Educational Record Protection",
                description="Protect educational records from unauthorized disclosure",
                control_objective="Ensure systems processing educational records are secure",
                implementation_guidance="Identify and secure SBOM components that handle educational data",
                testing_procedures=["Review SBOM for educational data processing", "Verify security controls"],
                evidence_requirements=["SBOM component analysis", "Security control documentation"],
                automation_possible=True,
                risk_level="High",
                mandatory=True
            )
        ]
    
    # Helper methods
    def _extract_components(self, sbom_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract components from SBOM data"""
        components = []
        
        if sbom_data.get('bomFormat') == 'CycloneDX':
            components = sbom_data.get('components', [])
        elif sbom_data.get('spdxVersion'):
            for package in sbom_data.get('packages', []):
                components.append({
                    'name': package.get('name'),
                    'version': package.get('versionInfo'),
                    'licenses': [package.get('licenseConcluded')] if package.get('licenseConcluded') else []
                })
        
        return components
    
    def _extract_vulnerabilities(self, sbom_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract vulnerabilities from SBOM data"""
        if sbom_data.get('bomFormat') == 'CycloneDX':
            return sbom_data.get('vulnerabilities', [])
        return []

async def main():
    """Main function for CLI usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SBOM Compliance Tracker")
    parser.add_argument("--config", required=True, help="Configuration file")
    parser.add_argument("--sbom-file", required=True, help="SBOM file to analyze")
    parser.add_argument("--framework", required=True, 
                       choices=[f.value for f in ComplianceFramework],
                       help="Compliance framework")
    parser.add_argument("--output-dir", default="security/reports", help="Output directory")
    parser.add_argument("--format", choices=['json', 'html', 'csv'], default='json', help="Report format")
    parser.add_argument("--dashboard", action="store_true", help="Generate dashboard")
    
    args = parser.parse_args()
    
    # Initialize tracker
    tracker = ComplianceTracker(args.config)
    
    # Load SBOM data
    with open(args.sbom_file, 'r') as f:
        sbom_data = json.load(f)
    
    # Perform compliance assessment
    framework = ComplianceFramework(args.framework)
    report = tracker.assess_compliance(sbom_data, framework)
    
    # Export report
    output_file = f"{args.output_dir}/compliance-{framework.value}.{args.format}"
    tracker.export_compliance_report(report, output_file, args.format)
    
    # Generate dashboard if requested
    if args.dashboard:
        dashboard_file = f"{args.output_dir}/compliance-dashboard.html"
        tracker.generate_compliance_dashboard([report], dashboard_file)
    
    logger.info(f"Compliance assessment completed. Score: {report.overall_score:.1f}%")

if __name__ == "__main__":
    asyncio.run(main())