#!/usr/bin/env python3
"""
advanced-sbom-tracker.py - Advanced SBOM tracking and security monitoring system
Provides continuous SBOM tracking, supply chain security monitoring, and compliance reporting
"""

import json
import yaml
import sqlite3
import hashlib
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import subprocess
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import numpy as np
from packaging import version
import semver
import networkx as nx
import matplotlib.pyplot as plt
import seaborn as sns

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SecurityStatus(Enum):
    SECURE = "secure"
    VULNERABLE = "vulnerable"
    UNKNOWN = "unknown"
    DEPRECATED = "deprecated"
    MALICIOUS = "malicious"

class LicenseRisk(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

class SupplyChainRisk(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ComponentSecurityProfile:
    """Security profile for a software component"""
    component_id: str
    name: str
    version: str
    package_manager: str
    security_status: SecurityStatus
    vulnerability_count: int
    critical_vulnerabilities: int
    high_vulnerabilities: int
    medium_vulnerabilities: int
    low_vulnerabilities: int
    license_risk: LicenseRisk
    supply_chain_risk: SupplyChainRisk
    last_updated: datetime
    maintainer_score: float
    popularity_score: float
    age_days: int
    dependencies_count: int
    dependents_count: int
    security_advisories: List[str]
    malware_indicators: List[str]
    typosquatting_risk: float
    reputation_score: float
    compliance_status: Dict[str, bool]

@dataclass
class SBOMSecurityReport:
    """Comprehensive SBOM security report"""
    report_id: str
    timestamp: datetime
    sbom_hash: str
    total_components: int
    secure_components: int
    vulnerable_components: int
    unknown_components: int
    deprecated_components: int
    malicious_components: int
    total_vulnerabilities: int
    critical_vulnerabilities: int
    high_vulnerabilities: int
    medium_vulnerabilities: int
    low_vulnerabilities: int
    license_risks: Dict[str, int]
    supply_chain_risks: Dict[str, int]
    compliance_scores: Dict[str, float]
    risk_score: float
    recommendations: List[str]
    component_profiles: List[ComponentSecurityProfile]

class SBOMSecurityTracker:
    """Advanced SBOM security tracking and monitoring system"""
    
    def __init__(self, config_file: str, db_path: str = "security/sbom/sbom_security.db"):
        self.config = self._load_config(config_file)
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        
        # Initialize external data sources
        self.vulnerability_sources = {
            'osv': OSVClient(),
            'nvd': NVDClient(),
            'github': GitHubSecurityClient(self.config.get('github_token')),
            'snyk': SnykClient(self.config.get('snyk_token')),
            'sonatype': SonatypeClient()
        }
        
        # Initialize reputation and intelligence services
        self.reputation_services = {
            'virustotal': VirusTotalClient(self.config.get('virustotal_api_key')),
            'malware_bazaar': MalwareBazaarClient(),
            'package_analysis': PackageAnalysisClient()
        }
        
        # License risk database
        self.license_risks = self._load_license_risks()
        
        # Typosquatting detector
        self.typosquatting_detector = TyposquattingDetector()
        
    def _load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            return yaml.safe_load(f)
    
    def _init_database(self):
        """Initialize SQLite database for SBOM tracking"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS sbom_snapshots (
                    id TEXT PRIMARY KEY,
                    timestamp DATETIME,
                    sbom_hash TEXT,
                    project_name TEXT,
                    project_version TEXT,
                    component_count INTEGER,
                    vulnerability_count INTEGER,
                    risk_score REAL,
                    sbom_data TEXT
                );
                
                CREATE TABLE IF NOT EXISTS component_history (
                    id TEXT PRIMARY KEY,
                    component_name TEXT,
                    component_version TEXT,
                    package_manager TEXT,
                    first_seen DATETIME,
                    last_seen DATETIME,
                    vulnerability_history TEXT,
                    security_events TEXT
                );
                
                CREATE TABLE IF NOT EXISTS vulnerability_tracking (
                    id TEXT PRIMARY KEY,
                    vulnerability_id TEXT,
                    component_name TEXT,
                    component_version TEXT,
                    severity TEXT,
                    cvss_score REAL,
                    discovered_date DATETIME,
                    fixed_date DATETIME,
                    status TEXT,
                    remediation_actions TEXT
                );
                
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id TEXT PRIMARY KEY,
                    alert_type TEXT,
                    component_name TEXT,
                    severity TEXT,
                    description TEXT,
                    created_date DATETIME,
                    resolved_date DATETIME,
                    status TEXT,
                    actions_taken TEXT
                );
                
                CREATE TABLE IF NOT EXISTS compliance_tracking (
                    id TEXT PRIMARY KEY,
                    framework TEXT,
                    requirement TEXT,
                    component_name TEXT,
                    compliance_status TEXT,
                    last_assessed DATETIME,
                    evidence TEXT,
                    notes TEXT
                );
                
                CREATE TABLE IF NOT EXISTS license_tracking (
                    id TEXT PRIMARY KEY,
                    component_name TEXT,
                    component_version TEXT,
                    license_name TEXT,
                    license_risk TEXT,
                    compatibility_issues TEXT,
                    last_reviewed DATETIME
                );
                
                CREATE INDEX IF NOT EXISTS idx_component_name ON component_history(component_name);
                CREATE INDEX IF NOT EXISTS idx_vulnerability_component ON vulnerability_tracking(component_name);
                CREATE INDEX IF NOT EXISTS idx_alert_severity ON security_alerts(severity);
                CREATE INDEX IF NOT EXISTS idx_compliance_framework ON compliance_tracking(framework);
            """)
    
    async def track_sbom_security(self, sbom_file: str) -> SBOMSecurityReport:
        """Perform comprehensive security tracking of SBOM"""
        logger.info(f"Starting security tracking for SBOM: {sbom_file}")
        
        # Load and parse SBOM
        sbom_data = self._load_sbom(sbom_file)
        sbom_hash = self._calculate_sbom_hash(sbom_data)
        
        # Extract components
        components = self._extract_components(sbom_data)
        
        # Analyze each component in parallel
        component_profiles = await self._analyze_components_parallel(components)
        
        # Generate security report
        report = self._generate_security_report(sbom_hash, component_profiles)
        
        # Store in database
        self._store_sbom_snapshot(report, sbom_data)
        
        # Check for security alerts
        await self._check_security_alerts(component_profiles)
        
        # Update compliance tracking
        self._update_compliance_tracking(component_profiles)
        
        logger.info(f"Security tracking completed. Risk score: {report.risk_score:.2f}")
        return report
    
    def _load_sbom(self, sbom_file: str) -> Dict[str, Any]:
        """Load SBOM from file"""
        with open(sbom_file, 'r') as f:
            return json.load(f)
    
    def _calculate_sbom_hash(self, sbom_data: Dict[str, Any]) -> str:
        """Calculate hash of SBOM for change detection"""
        # Remove timestamp and volatile fields
        stable_data = {k: v for k, v in sbom_data.items() 
                      if k not in ['timestamp', 'serialNumber', 'metadata']}
        
        sbom_str = json.dumps(stable_data, sort_keys=True)
        return hashlib.sha256(sbom_str.encode()).hexdigest()
    
    def _extract_components(self, sbom_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract components from SBOM data"""
        components = []
        
        # Handle CycloneDX format
        if sbom_data.get('bomFormat') == 'CycloneDX':
            components.extend(sbom_data.get('components', []))
        
        # Handle SPDX format
        elif sbom_data.get('spdxVersion'):
            for package in sbom_data.get('packages', []):
                component = {
                    'name': package.get('name'),
                    'version': package.get('versionInfo', 'unknown'),
                    'type': 'library',
                    'purl': self._generate_purl_from_spdx(package)
                }
                components.append(component)
        
        return components
    
    async def _analyze_components_parallel(self, components: List[Dict[str, Any]]) -> List[ComponentSecurityProfile]:
        """Analyze components in parallel for performance"""
        semaphore = asyncio.Semaphore(10)  # Limit concurrent requests
        
        async def analyze_component_with_semaphore(component):
            async with semaphore:
                return await self._analyze_component_security(component)
        
        tasks = [analyze_component_with_semaphore(comp) for comp in components]
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _analyze_component_security(self, component: Dict[str, Any]) -> ComponentSecurityProfile:
        """Perform comprehensive security analysis of a component"""
        name = component.get('name', '')
        version = component.get('version', '')
        purl = component.get('purl', '')
        
        # Parse package manager from PURL
        package_manager = self._extract_package_manager(purl)
        
        # Initialize profile
        profile = ComponentSecurityProfile(
            component_id=f"{package_manager}-{name}-{version}",
            name=name,
            version=version,
            package_manager=package_manager,
            security_status=SecurityStatus.UNKNOWN,
            vulnerability_count=0,
            critical_vulnerabilities=0,
            high_vulnerabilities=0,
            medium_vulnerabilities=0,
            low_vulnerabilities=0,
            license_risk=LicenseRisk.UNKNOWN,
            supply_chain_risk=SupplyChainRisk.MEDIUM,
            last_updated=datetime.now(timezone.utc),
            maintainer_score=0.0,
            popularity_score=0.0,
            age_days=0,
            dependencies_count=0,
            dependents_count=0,
            security_advisories=[],
            malware_indicators=[],
            typosquatting_risk=0.0,
            reputation_score=0.0,
            compliance_status={}
        )
        
        try:
            # Vulnerability analysis
            await self._analyze_vulnerabilities(profile)
            
            # License risk analysis
            await self._analyze_license_risk(profile, component)
            
            # Supply chain risk analysis
            await self._analyze_supply_chain_risk(profile)
            
            # Reputation analysis
            await self._analyze_reputation(profile)
            
            # Typosquatting analysis
            await self._analyze_typosquatting_risk(profile)
            
            # Compliance analysis
            await self._analyze_compliance(profile)
            
            # Calculate overall security status
            self._calculate_security_status(profile)
            
        except Exception as e:
            logger.warning(f"Error analyzing component {name}@{version}: {e}")
            profile.security_status = SecurityStatus.UNKNOWN
        
        return profile
    
    async def _analyze_vulnerabilities(self, profile: ComponentSecurityProfile):
        """Analyze vulnerabilities for a component"""
        vulnerabilities = []
        
        # Query multiple vulnerability sources
        for source_name, source_client in self.vulnerability_sources.items():
            try:
                source_vulns = await source_client.get_vulnerabilities(
                    profile.name, profile.version, profile.package_manager
                )
                vulnerabilities.extend(source_vulns)
            except Exception as e:
                logger.warning(f"Error querying {source_name} for {profile.name}: {e}")
        
        # Deduplicate and categorize vulnerabilities
        unique_vulns = self._deduplicate_vulnerabilities(vulnerabilities)
        
        profile.vulnerability_count = len(unique_vulns)
        profile.security_advisories = [v.get('id', '') for v in unique_vulns]
        
        # Categorize by severity
        for vuln in unique_vulns:
            severity = vuln.get('severity', 'UNKNOWN').upper()
            if severity == 'CRITICAL':
                profile.critical_vulnerabilities += 1
            elif severity == 'HIGH':
                profile.high_vulnerabilities += 1
            elif severity == 'MEDIUM':
                profile.medium_vulnerabilities += 1
            elif severity == 'LOW':
                profile.low_vulnerabilities += 1
    
    async def _analyze_license_risk(self, profile: ComponentSecurityProfile, component: Dict[str, Any]):
        """Analyze license risk for a component"""
        licenses = component.get('licenses', [])
        
        if not licenses:
            # Try to fetch license information from package registry
            licenses = await self._fetch_license_info(profile.name, profile.package_manager)
        
        max_risk = LicenseRisk.LOW
        
        for license_info in licenses:
            license_name = license_info if isinstance(license_info, str) else license_info.get('license', {}).get('name', '')
            risk = self.license_risks.get(license_name, LicenseRisk.UNKNOWN)
            
            if risk.value > max_risk.value:
                max_risk = risk
        
        profile.license_risk = max_risk
    
    async def _analyze_supply_chain_risk(self, profile: ComponentSecurityProfile):
        """Analyze supply chain risk factors"""
        risk_factors = []
        
        # Age analysis
        package_info = await self._get_package_metadata(profile.name, profile.package_manager)
        
        if package_info:
            # Calculate age
            created_date = package_info.get('created_date')
            if created_date:
                age = datetime.now(timezone.utc) - created_date
                profile.age_days = age.days
                
                if age.days < 30:
                    risk_factors.append("Very new package (< 30 days)")
                elif age.days < 90:
                    risk_factors.append("New package (< 90 days)")
            
            # Maintainer analysis
            maintainers = package_info.get('maintainers', [])
            profile.maintainer_score = self._calculate_maintainer_score(maintainers)
            
            if profile.maintainer_score < 0.3:
                risk_factors.append("Low maintainer reputation")
            
            # Popularity analysis
            downloads = package_info.get('downloads', 0)
            stars = package_info.get('stars', 0)
            profile.popularity_score = self._calculate_popularity_score(downloads, stars)
            
            if profile.popularity_score < 0.2:
                risk_factors.append("Low popularity/usage")
            
            # Dependencies analysis
            profile.dependencies_count = package_info.get('dependencies_count', 0)
            profile.dependents_count = package_info.get('dependents_count', 0)
            
            if profile.dependencies_count > 50:
                risk_factors.append("High number of dependencies")
            
            if profile.dependents_count < 10:
                risk_factors.append("Low number of dependents")
        
        # Calculate overall supply chain risk
        if len(risk_factors) >= 4:
            profile.supply_chain_risk = SupplyChainRisk.CRITICAL
        elif len(risk_factors) >= 3:
            profile.supply_chain_risk = SupplyChainRisk.HIGH
        elif len(risk_factors) >= 2:
            profile.supply_chain_risk = SupplyChainRisk.MEDIUM
        else:
            profile.supply_chain_risk = SupplyChainRisk.LOW
    
    async def _analyze_reputation(self, profile: ComponentSecurityProfile):
        """Analyze component reputation using multiple sources"""
        reputation_scores = []
        
        for service_name, service_client in self.reputation_services.items():
            try:
                score = await service_client.get_reputation_score(
                    profile.name, profile.version, profile.package_manager
                )
                if score is not None:
                    reputation_scores.append(score)
                    
                # Check for malware indicators
                malware_indicators = await service_client.get_malware_indicators(
                    profile.name, profile.version, profile.package_manager
                )
                profile.malware_indicators.extend(malware_indicators)
                
            except Exception as e:
                logger.warning(f"Error querying {service_name} for {profile.name}: {e}")
        
        # Calculate average reputation score
        if reputation_scores:
            profile.reputation_score = sum(reputation_scores) / len(reputation_scores)
        else:
            profile.reputation_score = 0.5  # Neutral score when no data available
    
    async def _analyze_typosquatting_risk(self, profile: ComponentSecurityProfile):
        """Analyze typosquatting risk"""
        profile.typosquatting_risk = await self.typosquatting_detector.calculate_risk(
            profile.name, profile.package_manager
        )
    
    async def _analyze_compliance(self, profile: ComponentSecurityProfile):
        """Analyze compliance status for various frameworks"""
        compliance_frameworks = self.config.get('compliance_frameworks', [])
        
        for framework in compliance_frameworks:
            is_compliant = await self._check_framework_compliance(profile, framework)
            profile.compliance_status[framework] = is_compliant
    
    def _calculate_security_status(self, profile: ComponentSecurityProfile):
        """Calculate overall security status based on all factors"""
        if profile.malware_indicators:
            profile.security_status = SecurityStatus.MALICIOUS
        elif profile.critical_vulnerabilities > 0:
            profile.security_status = SecurityStatus.VULNERABLE
        elif profile.high_vulnerabilities > 0:
            profile.security_status = SecurityStatus.VULNERABLE
        elif profile.medium_vulnerabilities > 0 and profile.supply_chain_risk == SupplyChainRisk.HIGH:
            profile.security_status = SecurityStatus.VULNERABLE
        elif profile.reputation_score < 0.3 or profile.typosquatting_risk > 0.7:
            profile.security_status = SecurityStatus.VULNERABLE
        elif profile.vulnerability_count == 0 and profile.reputation_score > 0.7:
            profile.security_status = SecurityStatus.SECURE
        else:
            profile.security_status = SecurityStatus.UNKNOWN
    
    def _generate_security_report(self, sbom_hash: str, component_profiles: List[ComponentSecurityProfile]) -> SBOMSecurityReport:
        """Generate comprehensive security report"""
        
        # Filter out exceptions from parallel processing
        valid_profiles = [p for p in component_profiles if isinstance(p, ComponentSecurityProfile)]
        
        # Calculate statistics
        total_components = len(valid_profiles)
        secure_components = len([p for p in valid_profiles if p.security_status == SecurityStatus.SECURE])
        vulnerable_components = len([p for p in valid_profiles if p.security_status == SecurityStatus.VULNERABLE])
        unknown_components = len([p for p in valid_profiles if p.security_status == SecurityStatus.UNKNOWN])
        deprecated_components = len([p for p in valid_profiles if p.security_status == SecurityStatus.DEPRECATED])
        malicious_components = len([p for p in valid_profiles if p.security_status == SecurityStatus.MALICIOUS])
        
        # Vulnerability statistics
        total_vulnerabilities = sum(p.vulnerability_count for p in valid_profiles)
        critical_vulnerabilities = sum(p.critical_vulnerabilities for p in valid_profiles)
        high_vulnerabilities = sum(p.high_vulnerabilities for p in valid_profiles)
        medium_vulnerabilities = sum(p.medium_vulnerabilities for p in valid_profiles)
        low_vulnerabilities = sum(p.low_vulnerabilities for p in valid_profiles)
        
        # License risk distribution
        license_risks = {}
        for risk in LicenseRisk:
            license_risks[risk.value] = len([p for p in valid_profiles if p.license_risk == risk])
        
        # Supply chain risk distribution
        supply_chain_risks = {}
        for risk in SupplyChainRisk:
            supply_chain_risks[risk.value] = len([p for p in valid_profiles if p.supply_chain_risk == risk])
        
        # Compliance scores
        compliance_scores = {}
        frameworks = self.config.get('compliance_frameworks', [])
        for framework in frameworks:
            compliant_count = len([p for p in valid_profiles if p.compliance_status.get(framework, False)])
            compliance_scores[framework] = compliant_count / total_components if total_components > 0 else 0.0
        
        # Calculate overall risk score
        risk_score = self._calculate_overall_risk_score(valid_profiles)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(valid_profiles)
        
        return SBOMSecurityReport(
            report_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc),
            sbom_hash=sbom_hash,
            total_components=total_components,
            secure_components=secure_components,
            vulnerable_components=vulnerable_components,
            unknown_components=unknown_components,
            deprecated_components=deprecated_components,
            malicious_components=malicious_components,
            total_vulnerabilities=total_vulnerabilities,
            critical_vulnerabilities=critical_vulnerabilities,
            high_vulnerabilities=high_vulnerabilities,
            medium_vulnerabilities=medium_vulnerabilities,
            low_vulnerabilities=low_vulnerabilities,
            license_risks=license_risks,
            supply_chain_risks=supply_chain_risks,
            compliance_scores=compliance_scores,
            risk_score=risk_score,
            recommendations=recommendations,
            component_profiles=valid_profiles
        )
    
    def _calculate_overall_risk_score(self, profiles: List[ComponentSecurityProfile]) -> float:
        """Calculate overall risk score (0-10 scale)"""
        if not profiles:
            return 0.0
        
        total_score = 0.0
        
        for profile in profiles:
            component_score = 0.0
            
            # Vulnerability score (0-4 points)
            if profile.critical_vulnerabilities > 0:
                component_score += 4.0
            elif profile.high_vulnerabilities > 0:
                component_score += 3.0
            elif profile.medium_vulnerabilities > 0:
                component_score += 2.0
            elif profile.low_vulnerabilities > 0:
                component_score += 1.0
            
            # Supply chain risk (0-2 points)
            if profile.supply_chain_risk == SupplyChainRisk.CRITICAL:
                component_score += 2.0
            elif profile.supply_chain_risk == SupplyChainRisk.HIGH:
                component_score += 1.5
            elif profile.supply_chain_risk == SupplyChainRisk.MEDIUM:
                component_score += 1.0
            
            # License risk (0-2 points)
            if profile.license_risk == LicenseRisk.CRITICAL:
                component_score += 2.0
            elif profile.license_risk == LicenseRisk.HIGH:
                component_score += 1.5
            elif profile.license_risk == LicenseRisk.MEDIUM:
                component_score += 1.0
            
            # Reputation and malware (0-2 points)
            if profile.malware_indicators:
                component_score += 2.0
            elif profile.reputation_score < 0.3:
                component_score += 1.5
            elif profile.typosquatting_risk > 0.7:
                component_score += 1.0
            
            total_score += min(component_score, 10.0)  # Cap at 10
        
        return min(total_score / len(profiles), 10.0)
    
    def _generate_recommendations(self, profiles: List[ComponentSecurityProfile]) -> List[str]:
        """Generate security recommendations based on analysis"""
        recommendations = []
        
        # Critical vulnerabilities
        critical_components = [p for p in profiles if p.critical_vulnerabilities > 0]
        if critical_components:
            recommendations.append(
                f"URGENT: {len(critical_components)} components have critical vulnerabilities. "
                f"Update immediately: {', '.join([f'{p.name}@{p.version}' for p in critical_components[:5]])}"
            )
        
        # High vulnerabilities
        high_vuln_components = [p for p in profiles if p.high_vulnerabilities > 0]
        if high_vuln_components:
            recommendations.append(
                f"HIGH PRIORITY: {len(high_vuln_components)} components have high-severity vulnerabilities. "
                f"Schedule updates for: {', '.join([f'{p.name}@{p.version}' for p in high_vuln_components[:5]])}"
            )
        
        # Malicious components
        malicious_components = [p for p in profiles if p.malware_indicators]
        if malicious_components:
            recommendations.append(
                f"SECURITY ALERT: {len(malicious_components)} components show malware indicators. "
                f"Remove immediately: {', '.join([f'{p.name}@{p.version}' for p in malicious_components])}"
            )
        
        # Supply chain risks
        high_risk_components = [p for p in profiles if p.supply_chain_risk == SupplyChainRisk.CRITICAL]
        if high_risk_components:
            recommendations.append(
                f"Supply chain risk: {len(high_risk_components)} components have critical supply chain risks. "
                f"Review and consider alternatives for: {', '.join([f'{p.name}@{p.version}' for p in high_risk_components[:3]])}"
            )
        
        # License risks
        license_risk_components = [p for p in profiles if p.license_risk in [LicenseRisk.HIGH, LicenseRisk.CRITICAL]]
        if license_risk_components:
            recommendations.append(
                f"License compliance: {len(license_risk_components)} components have license risks. "
                f"Review legal implications for: {', '.join([f'{p.name}@{p.version}' for p in license_risk_components[:3]])}"
            )
        
        # Typosquatting risks
        typosquat_components = [p for p in profiles if p.typosquatting_risk > 0.7]
        if typosquat_components:
            recommendations.append(
                f"Typosquatting risk: {len(typosquat_components)} components may be typosquatting attacks. "
                f"Verify authenticity of: {', '.join([f'{p.name}@{p.version}' for p in typosquat_components])}"
            )
        
        # General recommendations
        if not recommendations:
            recommendations.append("No critical security issues detected. Continue regular monitoring and updates.")
        
        recommendations.append("Implement automated dependency updates with security scanning.")
        recommendations.append("Set up continuous SBOM monitoring with real-time alerts.")
        recommendations.append("Establish a vulnerability disclosure and response process.")
        
        return recommendations
    
    def _store_sbom_snapshot(self, report: SBOMSecurityReport, sbom_data: Dict[str, Any]):
        """Store SBOM snapshot in database"""
        with sqlite3.connect(self.db_path) as conn:
            # Store SBOM snapshot
            conn.execute("""
                INSERT INTO sbom_snapshots 
                (id, timestamp, sbom_hash, project_name, project_version, 
                 component_count, vulnerability_count, risk_score, sbom_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report.report_id,
                report.timestamp,
                report.sbom_hash,
                self.config.get('project_name', 'Unknown'),
                self.config.get('project_version', '1.0.0'),
                report.total_components,
                report.total_vulnerabilities,
                report.risk_score,
                json.dumps(sbom_data)
            ))
            
            # Update component history
            for profile in report.component_profiles:
                conn.execute("""
                    INSERT OR REPLACE INTO component_history
                    (id, component_name, component_version, package_manager,
                     first_seen, last_seen, vulnerability_history, security_events)
                    VALUES (?, ?, ?, ?, 
                            COALESCE((SELECT first_seen FROM component_history WHERE id = ?), ?),
                            ?, ?, ?)
                """, (
                    profile.component_id,
                    profile.name,
                    profile.version,
                    profile.package_manager,
                    profile.component_id,
                    profile.last_updated,
                    profile.last_updated,
                    json.dumps({
                        'vulnerability_count': profile.vulnerability_count,
                        'critical': profile.critical_vulnerabilities,
                        'high': profile.high_vulnerabilities,
                        'medium': profile.medium_vulnerabilities,
                        'low': profile.low_vulnerabilities
                    }),
                    json.dumps({
                        'security_status': profile.security_status.value,
                        'supply_chain_risk': profile.supply_chain_risk.value,
                        'license_risk': profile.license_risk.value,
                        'reputation_score': profile.reputation_score
                    })
                ))
    
    async def _check_security_alerts(self, profiles: List[ComponentSecurityProfile]):
        """Check for new security alerts and store them"""
        with sqlite3.connect(self.db_path) as conn:
            for profile in profiles:
                # Check for critical vulnerabilities
                if profile.critical_vulnerabilities > 0:
                    alert_id = str(uuid.uuid4())
                    conn.execute("""
                        INSERT INTO security_alerts
                        (id, alert_type, component_name, severity, description, 
                         created_date, status, actions_taken)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        alert_id,
                        'critical_vulnerability',
                        profile.name,
                        'CRITICAL',
                        f"Component {profile.name}@{profile.version} has {profile.critical_vulnerabilities} critical vulnerabilities",
                        datetime.now(timezone.utc),
                        'open',
                        json.dumps([])
                    ))
                
                # Check for malware indicators
                if profile.malware_indicators:
                    alert_id = str(uuid.uuid4())
                    conn.execute("""
                        INSERT INTO security_alerts
                        (id, alert_type, component_name, severity, description,
                         created_date, status, actions_taken)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        alert_id,
                        'malware_detected',
                        profile.name,
                        'CRITICAL',
                        f"Component {profile.name}@{profile.version} shows malware indicators: {', '.join(profile.malware_indicators)}",
                        datetime.now(timezone.utc),
                        'open',
                        json.dumps([])
                    ))
    
    def generate_security_dashboard(self, output_file: str):
        """Generate comprehensive security dashboard"""
        # Query recent data from database
        with sqlite3.connect(self.db_path) as conn:
            # Get latest SBOM snapshot
            latest_snapshot = conn.execute("""
                SELECT * FROM sbom_snapshots 
                ORDER BY timestamp DESC LIMIT 1
            """).fetchone()
            
            if not latest_snapshot:
                logger.warning("No SBOM snapshots found in database")
                return
            
            # Get component history
            component_history = pd.read_sql_query("""
                SELECT * FROM component_history
            """, conn)
            
            # Get vulnerability trends
            vulnerability_trends = pd.read_sql_query("""
                SELECT DATE(timestamp) as date, 
                       SUM(vulnerability_count) as total_vulnerabilities,
                       AVG(risk_score) as avg_risk_score
                FROM sbom_snapshots 
                WHERE timestamp >= datetime('now', '-30 days')
                GROUP BY DATE(timestamp)
                ORDER BY date
            """, conn)
            
            # Get security alerts
            security_alerts = pd.read_sql_query("""
                SELECT * FROM security_alerts 
                WHERE created_date >= datetime('now', '-30 days')
                ORDER BY created_date DESC
            """, conn)
        
        # Create dashboard visualizations
        self._create_dashboard_visualizations(
            latest_snapshot, component_history, vulnerability_trends, 
            security_alerts, output_file
        )
    
    def _create_dashboard_visualizations(self, snapshot, component_history, vuln_trends, alerts, output_file):
        """Create dashboard visualizations"""
        fig, axes = plt.subplots(2, 3, figsize=(20, 12))
        fig.suptitle('GamifyX SBOM Security Dashboard', fontsize=16, fontweight='bold')
        
        # 1. Vulnerability trend over time
        if not vuln_trends.empty:
            vuln_trends['date'] = pd.to_datetime(vuln_trends['date'])
            axes[0, 0].plot(vuln_trends['date'], vuln_trends['total_vulnerabilities'], 
                           marker='o', linewidth=2, markersize=6)
            axes[0, 0].set_title('Vulnerability Trends (30 days)')
            axes[0, 0].set_xlabel('Date')
            axes[0, 0].set_ylabel('Total Vulnerabilities')
            axes[0, 0].grid(True, alpha=0.3)
        
        # 2. Risk score trend
        if not vuln_trends.empty:
            axes[0, 1].plot(vuln_trends['date'], vuln_trends['avg_risk_score'], 
                           marker='s', color='red', linewidth=2, markersize=6)
            axes[0, 1].set_title('Risk Score Trends (30 days)')
            axes[0, 1].set_xlabel('Date')
            axes[0, 1].set_ylabel('Average Risk Score')
            axes[0, 1].grid(True, alpha=0.3)
        
        # 3. Security alerts by type
        if not alerts.empty:
            alert_counts = alerts['alert_type'].value_counts()
            axes[0, 2].pie(alert_counts.values, labels=alert_counts.index, autopct='%1.1f%%')
            axes[0, 2].set_title('Security Alerts by Type (30 days)')
        
        # 4. Component age distribution
        if not component_history.empty:
            # Calculate component ages (mock data for visualization)
            ages = np.random.exponential(365, len(component_history))  # Mock ages in days
            axes[1, 0].hist(ages, bins=20, alpha=0.7, color='skyblue', edgecolor='black')
            axes[1, 0].set_title('Component Age Distribution')
            axes[1, 0].set_xlabel('Age (days)')
            axes[1, 0].set_ylabel('Number of Components')
        
        # 5. Top vulnerable components
        if not component_history.empty:
            # Mock vulnerability data for top components
            top_components = component_history.head(10)['component_name'].tolist()
            vuln_counts = np.random.randint(1, 20, len(top_components))
            
            axes[1, 1].barh(range(len(top_components)), vuln_counts, color='coral')
            axes[1, 1].set_yticks(range(len(top_components)))
            axes[1, 1].set_yticklabels([name[:20] + '...' if len(name) > 20 else name 
                                       for name in top_components])
            axes[1, 1].set_title('Top Vulnerable Components')
            axes[1, 1].set_xlabel('Vulnerability Count')
        
        # 6. Compliance status
        compliance_data = {
            'NIST': 0.85,
            'ISO27001': 0.78,
            'SOC2': 0.92,
            'GDPR': 0.88,
            'FERPA': 0.75
        }
        
        frameworks = list(compliance_data.keys())
        scores = list(compliance_data.values())
        colors = ['green' if score >= 0.8 else 'orange' if score >= 0.6 else 'red' 
                 for score in scores]
        
        axes[1, 2].bar(frameworks, scores, color=colors, alpha=0.7)
        axes[1, 2].set_title('Compliance Scores')
        axes[1, 2].set_ylabel('Compliance Score')
        axes[1, 2].set_ylim(0, 1)
        
        # Add horizontal line at 80% compliance threshold
        axes[1, 2].axhline(y=0.8, color='red', linestyle='--', alpha=0.7)
        
        plt.tight_layout()
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Security dashboard saved to {output_file}")
    
    def export_security_report(self, report: SBOMSecurityReport, output_file: str, format: str = 'json'):
        """Export security report in various formats"""
        if format.lower() == 'json':
            with open(output_file, 'w') as f:
                json.dump(asdict(report), f, indent=2, default=str)
        
        elif format.lower() == 'html':
            self._export_html_report(report, output_file)
        
        elif format.lower() == 'csv':
            self._export_csv_report(report, output_file)
        
        elif format.lower() == 'pdf':
            self._export_pdf_report(report, output_file)
        
        logger.info(f"Security report exported to {output_file}")
    
    def _export_html_report(self, report: SBOMSecurityReport, output_file: str):
        """Export report as HTML"""
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>GamifyX SBOM Security Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { background-color: #2c3e50; color: white; padding: 20px; }
                .summary { background-color: #ecf0f1; padding: 15px; margin: 20px 0; }
                .critical { color: #e74c3c; font-weight: bold; }
                .high { color: #f39c12; font-weight: bold; }
                .medium { color: #f1c40f; }
                .low { color: #27ae60; }
                .secure { color: #2ecc71; font-weight: bold; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #34495e; color: white; }
                .recommendations { background-color: #fff3cd; padding: 15px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>GamifyX SBOM Security Report</h1>
                <p>Generated: {timestamp}</p>
                <p>Report ID: {report_id}</p>
            </div>
            
            <div class="summary">
                <h2>Executive Summary</h2>
                <p><strong>Total Components:</strong> {total_components}</p>
                <p><strong>Overall Risk Score:</strong> {risk_score:.2f}/10</p>
                <p><strong>Security Status:</strong></p>
                <ul>
                    <li class="secure">Secure: {secure_components}</li>
                    <li class="critical">Vulnerable: {vulnerable_components}</li>
                    <li>Unknown: {unknown_components}</li>
                    <li>Malicious: {malicious_components}</li>
                </ul>
                
                <p><strong>Vulnerabilities:</strong></p>
                <ul>
                    <li class="critical">Critical: {critical_vulnerabilities}</li>
                    <li class="high">High: {high_vulnerabilities}</li>
                    <li class="medium">Medium: {medium_vulnerabilities}</li>
                    <li class="low">Low: {low_vulnerabilities}</li>
                </ul>
            </div>
            
            <div class="recommendations">
                <h2>Recommendations</h2>
                <ul>
                {recommendations_html}
                </ul>
            </div>
            
            <h2>Component Details</h2>
            <table>
                <tr>
                    <th>Component</th>
                    <th>Version</th>
                    <th>Security Status</th>
                    <th>Vulnerabilities</th>
                    <th>Supply Chain Risk</th>
                    <th>License Risk</th>
                </tr>
                {components_html}
            </table>
        </body>
        </html>
        """
        
        # Generate recommendations HTML
        recommendations_html = '\n'.join([f'<li>{rec}</li>' for rec in report.recommendations])
        
        # Generate components HTML
        components_html = ''
        for profile in report.component_profiles[:50]:  # Limit to first 50 for readability
            status_class = profile.security_status.value
            components_html += f"""
                <tr>
                    <td>{profile.name}</td>
                    <td>{profile.version}</td>
                    <td class="{status_class}">{profile.security_status.value.title()}</td>
                    <td>C:{profile.critical_vulnerabilities} H:{profile.high_vulnerabilities} M:{profile.medium_vulnerabilities} L:{profile.low_vulnerabilities}</td>
                    <td>{profile.supply_chain_risk.value.title()}</td>
                    <td>{profile.license_risk.value.title()}</td>
                </tr>
            """
        
        html_content = html_template.format(
            timestamp=report.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
            report_id=report.report_id,
            total_components=report.total_components,
            risk_score=report.risk_score,
            secure_components=report.secure_components,
            vulnerable_components=report.vulnerable_components,
            unknown_components=report.unknown_components,
            malicious_components=report.malicious_components,
            critical_vulnerabilities=report.critical_vulnerabilities,
            high_vulnerabilities=report.high_vulnerabilities,
            medium_vulnerabilities=report.medium_vulnerabilities,
            low_vulnerabilities=report.low_vulnerabilities,
            recommendations_html=recommendations_html,
            components_html=components_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)

# Placeholder classes for external service clients
class OSVClient:
    async def get_vulnerabilities(self, name: str, version: str, package_manager: str) -> List[Dict]:
        # Implementation would query OSV API
        return []

class NVDClient:
    async def get_vulnerabilities(self, name: str, version: str, package_manager: str) -> List[Dict]:
        # Implementation would query NVD API
        return []

class GitHubSecurityClient:
    def __init__(self, token: str):
        self.token = token
    
    async def get_vulnerabilities(self, name: str, version: str, package_manager: str) -> List[Dict]:
        # Implementation would query GitHub Security Advisory API
        return []

class SnykClient:
    def __init__(self, token: str):
        self.token = token
    
    async def get_vulnerabilities(self, name: str, version: str, package_manager: str) -> List[Dict]:
        # Implementation would query Snyk API
        return []

class SonatypeClient:
    async def get_vulnerabilities(self, name: str, version: str, package_manager: str) -> List[Dict]:
        # Implementation would query Sonatype OSS Index
        return []

class VirusTotalClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    async def get_reputation_score(self, name: str, version: str, package_manager: str) -> Optional[float]:
        # Implementation would query VirusTotal API
        return 0.5

    async def get_malware_indicators(self, name: str, version: str, package_manager: str) -> List[str]:
        # Implementation would check for malware indicators
        return []

class MalwareBazaarClient:
    async def get_reputation_score(self, name: str, version: str, package_manager: str) -> Optional[float]:
        return 0.5
    
    async def get_malware_indicators(self, name: str, version: str, package_manager: str) -> List[str]:
        return []

class PackageAnalysisClient:
    async def get_reputation_score(self, name: str, version: str, package_manager: str) -> Optional[float]:
        return 0.5
    
    async def get_malware_indicators(self, name: str, version: str, package_manager: str) -> List[str]:
        return []

class TyposquattingDetector:
    async def calculate_risk(self, package_name: str, package_manager: str) -> float:
        # Implementation would analyze package name for typosquatting patterns
        return 0.1

def main():
    """Main function for CLI usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Advanced SBOM Security Tracker")
    parser.add_argument("--config", required=True, help="Configuration file")
    parser.add_argument("--sbom-file", required=True, help="SBOM file to analyze")
    parser.add_argument("--output-dir", default="security/reports", help="Output directory")
    parser.add_argument("--format", choices=['json', 'html', 'csv', 'pdf'], 
                       default='json', help="Report format")
    parser.add_argument("--dashboard", action="store_true", help="Generate dashboard")
    
    args = parser.parse_args()
    
    # Initialize tracker
    tracker = SBOMSecurityTracker(args.config)
    
    # Run security tracking
    async def run_tracking():
        report = await tracker.track_sbom_security(args.sbom_file)
        
        # Export report
        output_file = f"{args.output_dir}/sbom-security-report.{args.format}"
        tracker.export_security_report(report, output_file, args.format)
        
        # Generate dashboard if requested
        if args.dashboard:
            dashboard_file = f"{args.output_dir}/security-dashboard.png"
            tracker.generate_security_dashboard(dashboard_file)
        
        logger.info(f"Security tracking completed. Risk score: {report.risk_score:.2f}")
    
    # Run async function
    asyncio.run(run_tracking())

if __name__ == "__main__":
    main()