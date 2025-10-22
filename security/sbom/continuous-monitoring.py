#!/usr/bin/env python3
"""
continuous-monitoring.py - Continuous SBOM security monitoring system
Provides real-time monitoring, alerting, and automated response for SBOM security events
"""

import asyncio
import json
import yaml
import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import hashlib
import aiohttp
import websockets
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import schedule
import time
import threading
from concurrent.futures import ThreadPoolExecutor
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import prometheus_client
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class MonitoringEvent(Enum):
    SBOM_CHANGED = "sbom_changed"
    NEW_VULNERABILITY = "new_vulnerability"
    CRITICAL_VULNERABILITY = "critical_vulnerability"
    MALWARE_DETECTED = "malware_detected"
    COMPLIANCE_VIOLATION = "compliance_violation"
    SUPPLY_CHAIN_RISK = "supply_chain_risk"
    LICENSE_VIOLATION = "license_violation"
    DEPENDENCY_ADDED = "dependency_added"
    DEPENDENCY_REMOVED = "dependency_removed"
    SECURITY_THRESHOLD_EXCEEDED = "security_threshold_exceeded"

@dataclass
class SecurityAlert:
    """Security alert data structure"""
    id: str
    timestamp: datetime
    event_type: MonitoringEvent
    severity: AlertSeverity
    component_name: str
    component_version: str
    title: str
    description: str
    impact_assessment: str
    recommended_actions: List[str]
    affected_systems: List[str]
    metadata: Dict[str, Any]
    acknowledged: bool = False
    resolved: bool = False
    assigned_to: Optional[str] = None

@dataclass
class MonitoringMetrics:
    """Monitoring metrics for Prometheus"""
    sbom_scans_total: Counter
    vulnerabilities_detected: Counter
    alerts_generated: Counter
    response_time: Histogram
    risk_score: Gauge
    component_count: Gauge
    compliance_score: Gauge

class SBOMFileWatcher(FileSystemEventHandler):
    """File system watcher for SBOM changes"""
    
    def __init__(self, monitor: 'ContinuousMonitor'):
        self.monitor = monitor
        self.last_processed = {}
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        file_path = Path(event.src_path)
        
        # Check if it's an SBOM file
        if self._is_sbom_file(file_path):
            # Debounce rapid file changes
            current_time = time.time()
            if file_path in self.last_processed:
                if current_time - self.last_processed[file_path] < 5:  # 5 second debounce
                    return
            
            self.last_processed[file_path] = current_time
            logger.info(f"SBOM file changed: {file_path}")
            
            # Schedule async processing
            asyncio.create_task(self.monitor.process_sbom_change(str(file_path)))
    
    def _is_sbom_file(self, file_path: Path) -> bool:
        """Check if file is an SBOM file"""
        if file_path.suffix.lower() != '.json':
            return False
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Check for CycloneDX format
            if data.get('bomFormat') == 'CycloneDX':
                return True
            
            # Check for SPDX format
            if data.get('spdxVersion'):
                return True
                
        except (json.JSONDecodeError, IOError):
            pass
        
        return False

class AlertManager:
    """Manages security alerts and notifications"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db_path = Path(config.get('database_path', 'security/sbom/monitoring.db'))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        
        # Initialize notification channels
        self.notification_channels = {
            'slack': SlackNotifier(config.get('slack', {})),
            'email': EmailNotifier(config.get('email', {})),
            'webhook': WebhookNotifier(config.get('webhook', {})),
            'pagerduty': PagerDutyNotifier(config.get('pagerduty', {}))
        }
        
    def _init_database(self):
        """Initialize alerts database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id TEXT PRIMARY KEY,
                    timestamp DATETIME,
                    event_type TEXT,
                    severity TEXT,
                    component_name TEXT,
                    component_version TEXT,
                    title TEXT,
                    description TEXT,
                    impact_assessment TEXT,
                    recommended_actions TEXT,
                    affected_systems TEXT,
                    metadata TEXT,
                    acknowledged BOOLEAN DEFAULT FALSE,
                    resolved BOOLEAN DEFAULT FALSE,
                    assigned_to TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alert_actions (
                    id TEXT PRIMARY KEY,
                    alert_id TEXT,
                    action_type TEXT,
                    action_data TEXT,
                    executed_at DATETIME,
                    success BOOLEAN,
                    error_message TEXT,
                    FOREIGN KEY (alert_id) REFERENCES security_alerts (id)
                )
            """)
    
    async def create_alert(self, alert: SecurityAlert) -> str:
        """Create and process a new security alert"""
        # Store alert in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO security_alerts 
                (id, timestamp, event_type, severity, component_name, component_version,
                 title, description, impact_assessment, recommended_actions, 
                 affected_systems, metadata, acknowledged, resolved, assigned_to)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert.id,
                alert.timestamp,
                alert.event_type.value,
                alert.severity.value,
                alert.component_name,
                alert.component_version,
                alert.title,
                alert.description,
                alert.impact_assessment,
                json.dumps(alert.recommended_actions),
                json.dumps(alert.affected_systems),
                json.dumps(alert.metadata),
                alert.acknowledged,
                alert.resolved,
                alert.assigned_to
            ))
        
        # Send notifications
        await self._send_notifications(alert)
        
        # Execute automated responses
        await self._execute_automated_responses(alert)
        
        logger.info(f"Security alert created: {alert.id} - {alert.title}")
        return alert.id
    
    async def _send_notifications(self, alert: SecurityAlert):
        """Send notifications through configured channels"""
        notification_config = self.config.get('notifications', {})
        
        for channel_name, channel_config in notification_config.items():
            if not channel_config.get('enabled', False):
                continue
            
            # Check severity threshold
            min_severity = AlertSeverity(channel_config.get('min_severity', 'info'))
            if self._severity_level(alert.severity) < self._severity_level(min_severity):
                continue
            
            # Send notification
            if channel_name in self.notification_channels:
                try:
                    await self.notification_channels[channel_name].send_notification(alert)
                    logger.info(f"Notification sent via {channel_name} for alert {alert.id}")
                except Exception as e:
                    logger.error(f"Failed to send notification via {channel_name}: {e}")
    
    async def _execute_automated_responses(self, alert: SecurityAlert):
        """Execute automated responses based on alert type and severity"""
        response_config = self.config.get('automated_responses', {})
        
        for response_rule in response_config.get('rules', []):
            if self._matches_rule(alert, response_rule):
                await self._execute_response_action(alert, response_rule)
    
    def _matches_rule(self, alert: SecurityAlert, rule: Dict[str, Any]) -> bool:
        """Check if alert matches response rule"""
        # Check event type
        if 'event_types' in rule:
            if alert.event_type.value not in rule['event_types']:
                return False
        
        # Check severity
        if 'min_severity' in rule:
            min_severity = AlertSeverity(rule['min_severity'])
            if self._severity_level(alert.severity) < self._severity_level(min_severity):
                return False
        
        # Check component patterns
        if 'component_patterns' in rule:
            import re
            patterns = rule['component_patterns']
            if not any(re.match(pattern, alert.component_name) for pattern in patterns):
                return False
        
        return True
    
    async def _execute_response_action(self, alert: SecurityAlert, rule: Dict[str, Any]):
        """Execute automated response action"""
        action_type = rule.get('action_type')
        action_data = rule.get('action_data', {})
        
        action_id = str(uuid.uuid4())
        success = False
        error_message = None
        
        try:
            if action_type == 'create_ticket':
                success = await self._create_ticket(alert, action_data)
            elif action_type == 'block_component':
                success = await self._block_component(alert, action_data)
            elif action_type == 'quarantine_system':
                success = await self._quarantine_system(alert, action_data)
            elif action_type == 'update_firewall':
                success = await self._update_firewall(alert, action_data)
            elif action_type == 'send_webhook':
                success = await self._send_webhook(alert, action_data)
            else:
                logger.warning(f"Unknown action type: {action_type}")
                return
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Failed to execute action {action_type} for alert {alert.id}: {e}")
        
        # Record action execution
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO alert_actions
                (id, alert_id, action_type, action_data, executed_at, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                action_id,
                alert.id,
                action_type,
                json.dumps(action_data),
                datetime.now(timezone.utc),
                success,
                error_message
            ))
    
    def _severity_level(self, severity: AlertSeverity) -> int:
        """Convert severity to numeric level for comparison"""
        levels = {
            AlertSeverity.INFO: 1,
            AlertSeverity.WARNING: 2,
            AlertSeverity.CRITICAL: 3,
            AlertSeverity.EMERGENCY: 4
        }
        return levels.get(severity, 0)

class ContinuousMonitor:
    """Main continuous monitoring system"""
    
    def __init__(self, config_file: str):
        self.config = self._load_config(config_file)
        self.alert_manager = AlertManager(self.config)
        self.metrics = self._init_metrics()
        
        # Initialize SBOM tracker
        from advanced_sbom_tracker import SBOMSecurityTracker
        self.sbom_tracker = SBOMSecurityTracker(config_file)
        
        # File watcher
        self.file_watcher = SBOMFileWatcher(self)
        self.observer = Observer()
        
        # Monitoring state
        self.monitoring_active = False
        self.last_scan_results = {}
        self.vulnerability_cache = {}
        
        # Background tasks
        self.background_tasks = set()
        
    def _load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            return yaml.safe_load(f)
    
    def _init_metrics(self) -> MonitoringMetrics:
        """Initialize Prometheus metrics"""
        registry = CollectorRegistry()
        
        return MonitoringMetrics(
            sbom_scans_total=Counter(
                'sbom_scans_total',
                'Total number of SBOM scans performed',
                ['status'],
                registry=registry
            ),
            vulnerabilities_detected=Counter(
                'vulnerabilities_detected_total',
                'Total number of vulnerabilities detected',
                ['severity', 'component'],
                registry=registry
            ),
            alerts_generated=Counter(
                'security_alerts_total',
                'Total number of security alerts generated',
                ['severity', 'event_type'],
                registry=registry
            ),
            response_time=Histogram(
                'sbom_scan_duration_seconds',
                'Time taken to complete SBOM security scan',
                registry=registry
            ),
            risk_score=Gauge(
                'sbom_risk_score',
                'Current SBOM risk score',
                registry=registry
            ),
            component_count=Gauge(
                'sbom_component_count',
                'Number of components in SBOM',
                ['status'],
                registry=registry
            ),
            compliance_score=Gauge(
                'compliance_score',
                'Compliance score for framework',
                ['framework'],
                registry=registry
            )
        )
    
    async def start_monitoring(self):
        """Start continuous monitoring"""
        logger.info("Starting continuous SBOM security monitoring...")
        self.monitoring_active = True
        
        # Start file system monitoring
        watch_paths = self.config.get('watch_paths', ['./'])
        for path in watch_paths:
            self.observer.schedule(self.file_watcher, path, recursive=True)
        
        self.observer.start()
        
        # Start scheduled scans
        self._schedule_periodic_scans()
        
        # Start vulnerability feed monitoring
        task = asyncio.create_task(self._monitor_vulnerability_feeds())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
        
        # Start compliance monitoring
        task = asyncio.create_task(self._monitor_compliance())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
        
        # Start metrics server
        self._start_metrics_server()
        
        logger.info("Continuous monitoring started successfully")
    
    async def stop_monitoring(self):
        """Stop continuous monitoring"""
        logger.info("Stopping continuous monitoring...")
        self.monitoring_active = False
        
        # Stop file system monitoring
        self.observer.stop()
        self.observer.join()
        
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        logger.info("Continuous monitoring stopped")
    
    def _schedule_periodic_scans(self):
        """Schedule periodic SBOM scans"""
        scan_interval = self.config.get('scan_interval_minutes', 60)
        
        def run_scheduled_scan():
            if self.monitoring_active:
                asyncio.create_task(self._perform_scheduled_scan())
        
        schedule.every(scan_interval).minutes.do(run_scheduled_scan)
        
        # Start scheduler in background thread
        def run_scheduler():
            while self.monitoring_active:
                schedule.run_pending()
                time.sleep(1)
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
    
    async def _perform_scheduled_scan(self):
        """Perform scheduled SBOM security scan"""
        logger.info("Performing scheduled SBOM security scan...")
        
        sbom_files = self._discover_sbom_files()
        
        for sbom_file in sbom_files:
            try:
                await self.process_sbom_change(sbom_file)
            except Exception as e:
                logger.error(f"Error processing SBOM file {sbom_file}: {e}")
    
    def _discover_sbom_files(self) -> List[str]:
        """Discover SBOM files in monitored directories"""
        sbom_files = []
        watch_paths = self.config.get('watch_paths', ['./'])
        
        for watch_path in watch_paths:
            path = Path(watch_path)
            if path.exists():
                # Look for SBOM files
                sbom_files.extend(path.rglob('*sbom*.json'))
                sbom_files.extend(path.rglob('*bom*.json'))
        
        return [str(f) for f in sbom_files]
    
    async def process_sbom_change(self, sbom_file: str):
        """Process SBOM file change"""
        start_time = time.time()
        
        try:
            # Track scan start
            self.metrics.sbom_scans_total.labels(status='started').inc()
            
            # Perform security analysis
            report = await self.sbom_tracker.track_sbom_security(sbom_file)
            
            # Update metrics
            self.metrics.risk_score.set(report.risk_score)
            self.metrics.component_count.labels(status='total').set(report.total_components)
            self.metrics.component_count.labels(status='vulnerable').set(report.vulnerable_components)
            self.metrics.component_count.labels(status='secure').set(report.secure_components)
            
            # Update vulnerability metrics
            self.metrics.vulnerabilities_detected.labels(severity='critical', component='all').inc(report.critical_vulnerabilities)
            self.metrics.vulnerabilities_detected.labels(severity='high', component='all').inc(report.high_vulnerabilities)
            self.metrics.vulnerabilities_detected.labels(severity='medium', component='all').inc(report.medium_vulnerabilities)
            self.metrics.vulnerabilities_detected.labels(severity='low', component='all').inc(report.low_vulnerabilities)
            
            # Check for security events
            await self._check_security_events(sbom_file, report)
            
            # Track successful scan
            self.metrics.sbom_scans_total.labels(status='success').inc()
            
            # Update scan duration
            duration = time.time() - start_time
            self.metrics.response_time.observe(duration)
            
            logger.info(f"SBOM security scan completed for {sbom_file}. Risk score: {report.risk_score:.2f}")
            
        except Exception as e:
            self.metrics.sbom_scans_total.labels(status='error').inc()
            logger.error(f"Error processing SBOM change for {sbom_file}: {e}")
            
            # Create alert for scan failure
            alert = SecurityAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(timezone.utc),
                event_type=MonitoringEvent.SBOM_CHANGED,
                severity=AlertSeverity.WARNING,
                component_name="SBOM Scanner",
                component_version="1.0.0",
                title="SBOM Scan Failed",
                description=f"Failed to scan SBOM file: {sbom_file}",
                impact_assessment="Monitoring coverage may be incomplete",
                recommended_actions=["Check SBOM file format", "Review scanner logs", "Verify file permissions"],
                affected_systems=[sbom_file],
                metadata={"error": str(e), "file": sbom_file}
            )
            
            await self.alert_manager.create_alert(alert)
    
    async def _check_security_events(self, sbom_file: str, report):
        """Check for security events and generate alerts"""
        # Check for critical vulnerabilities
        if report.critical_vulnerabilities > 0:
            critical_components = [p for p in report.component_profiles 
                                 if p.critical_vulnerabilities > 0]
            
            for component in critical_components[:5]:  # Limit to first 5
                alert = SecurityAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(timezone.utc),
                    event_type=MonitoringEvent.CRITICAL_VULNERABILITY,
                    severity=AlertSeverity.CRITICAL,
                    component_name=component.name,
                    component_version=component.version,
                    title=f"Critical Vulnerabilities in {component.name}",
                    description=f"Component {component.name}@{component.version} has {component.critical_vulnerabilities} critical vulnerabilities",
                    impact_assessment="High risk of exploitation, immediate action required",
                    recommended_actions=[
                        f"Update {component.name} to latest secure version",
                        "Review security advisories",
                        "Consider temporary isolation if update not available"
                    ],
                    affected_systems=[sbom_file],
                    metadata={
                        "vulnerabilities": component.security_advisories,
                        "package_manager": component.package_manager,
                        "supply_chain_risk": component.supply_chain_risk.value
                    }
                )
                
                await self.alert_manager.create_alert(alert)
                self.metrics.alerts_generated.labels(
                    severity='critical', 
                    event_type='critical_vulnerability'
                ).inc()
        
        # Check for malware indicators
        malicious_components = [p for p in report.component_profiles 
                              if p.malware_indicators]
        
        for component in malicious_components:
            alert = SecurityAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(timezone.utc),
                event_type=MonitoringEvent.MALWARE_DETECTED,
                severity=AlertSeverity.EMERGENCY,
                component_name=component.name,
                component_version=component.version,
                title=f"Malware Detected in {component.name}",
                description=f"Component {component.name}@{component.version} shows malware indicators: {', '.join(component.malware_indicators)}",
                impact_assessment="Critical security threat, immediate removal required",
                recommended_actions=[
                    f"Immediately remove {component.name} from all systems",
                    "Scan all systems for compromise",
                    "Review component source and installation method",
                    "Report to security team and component maintainers"
                ],
                affected_systems=[sbom_file],
                metadata={
                    "malware_indicators": component.malware_indicators,
                    "reputation_score": component.reputation_score,
                    "package_manager": component.package_manager
                }
            )
            
            await self.alert_manager.create_alert(alert)
            self.metrics.alerts_generated.labels(
                severity='emergency', 
                event_type='malware_detected'
            ).inc()
        
        # Check risk score threshold
        risk_threshold = self.config.get('risk_threshold', 7.0)
        if report.risk_score > risk_threshold:
            alert = SecurityAlert(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(timezone.utc),
                event_type=MonitoringEvent.SECURITY_THRESHOLD_EXCEEDED,
                severity=AlertSeverity.WARNING,
                component_name="SBOM",
                component_version="current",
                title="Security Risk Threshold Exceeded",
                description=f"SBOM risk score ({report.risk_score:.2f}) exceeds threshold ({risk_threshold})",
                impact_assessment="Elevated security risk across the application",
                recommended_actions=[
                    "Review high-risk components",
                    "Prioritize vulnerability remediation",
                    "Consider additional security controls"
                ],
                affected_systems=[sbom_file],
                metadata={
                    "risk_score": report.risk_score,
                    "threshold": risk_threshold,
                    "vulnerable_components": report.vulnerable_components
                }
            )
            
            await self.alert_manager.create_alert(alert)
            self.metrics.alerts_generated.labels(
                severity='warning', 
                event_type='security_threshold_exceeded'
            ).inc()
    
    async def _monitor_vulnerability_feeds(self):
        """Monitor external vulnerability feeds for new threats"""
        logger.info("Starting vulnerability feed monitoring...")
        
        while self.monitoring_active:
            try:
                # Check for new vulnerabilities affecting known components
                await self._check_vulnerability_feeds()
                
                # Wait before next check
                await asyncio.sleep(self.config.get('vulnerability_check_interval', 3600))  # 1 hour
                
            except Exception as e:
                logger.error(f"Error monitoring vulnerability feeds: {e}")
                await asyncio.sleep(300)  # 5 minutes on error
    
    async def _check_vulnerability_feeds(self):
        """Check vulnerability feeds for new threats"""
        # This would integrate with various vulnerability databases
        # For now, we'll implement a placeholder
        logger.debug("Checking vulnerability feeds...")
        
        # Get list of components from latest SBOM
        # Check each component against vulnerability databases
        # Generate alerts for new vulnerabilities
        pass
    
    async def _monitor_compliance(self):
        """Monitor compliance status"""
        logger.info("Starting compliance monitoring...")
        
        while self.monitoring_active:
            try:
                # Check compliance status
                compliance_scores = await self._check_compliance_status()
                
                # Update metrics
                for framework, score in compliance_scores.items():
                    self.metrics.compliance_score.labels(framework=framework).set(score)
                
                # Generate alerts for compliance violations
                await self._check_compliance_violations(compliance_scores)
                
                # Wait before next check
                await asyncio.sleep(self.config.get('compliance_check_interval', 86400))  # 24 hours
                
            except Exception as e:
                logger.error(f"Error monitoring compliance: {e}")
                await asyncio.sleep(3600)  # 1 hour on error
    
    async def _check_compliance_status(self) -> Dict[str, float]:
        """Check current compliance status"""
        # This would implement actual compliance checking
        # For now, return mock data
        return {
            'NIST': 0.85,
            'ISO27001': 0.78,
            'SOC2': 0.92,
            'GDPR': 0.88,
            'FERPA': 0.75
        }
    
    async def _check_compliance_violations(self, compliance_scores: Dict[str, float]):
        """Check for compliance violations and generate alerts"""
        compliance_threshold = self.config.get('compliance_threshold', 0.8)
        
        for framework, score in compliance_scores.items():
            if score < compliance_threshold:
                alert = SecurityAlert(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(timezone.utc),
                    event_type=MonitoringEvent.COMPLIANCE_VIOLATION,
                    severity=AlertSeverity.WARNING,
                    component_name="Compliance Monitor",
                    component_version="1.0.0",
                    title=f"{framework} Compliance Below Threshold",
                    description=f"{framework} compliance score ({score:.2f}) is below threshold ({compliance_threshold})",
                    impact_assessment="Regulatory compliance risk",
                    recommended_actions=[
                        f"Review {framework} compliance requirements",
                        "Address failing compliance controls",
                        "Update security policies and procedures"
                    ],
                    affected_systems=["All systems"],
                    metadata={
                        "framework": framework,
                        "score": score,
                        "threshold": compliance_threshold
                    }
                )
                
                await self.alert_manager.create_alert(alert)
                self.metrics.alerts_generated.labels(
                    severity='warning', 
                    event_type='compliance_violation'
                ).inc()
    
    def _start_metrics_server(self):
        """Start Prometheus metrics server"""
        metrics_port = self.config.get('metrics_port', 8000)
        
        def start_server():
            prometheus_client.start_http_server(metrics_port)
            logger.info(f"Metrics server started on port {metrics_port}")
        
        metrics_thread = threading.Thread(target=start_server, daemon=True)
        metrics_thread.start()

# Notification channel implementations
class SlackNotifier:
    def __init__(self, config: Dict[str, Any]):
        self.webhook_url = config.get('webhook_url')
        self.channel = config.get('channel', '#security-alerts')
        
    async def send_notification(self, alert: SecurityAlert):
        if not self.webhook_url:
            return
        
        color_map = {
            AlertSeverity.INFO: '#36a64f',
            AlertSeverity.WARNING: '#ff9500',
            AlertSeverity.CRITICAL: '#ff0000',
            AlertSeverity.EMERGENCY: '#8b0000'
        }
        
        payload = {
            "channel": self.channel,
            "username": "SBOM Security Monitor",
            "icon_emoji": ":warning:",
            "attachments": [{
                "color": color_map.get(alert.severity, '#36a64f'),
                "title": alert.title,
                "text": alert.description,
                "fields": [
                    {
                        "title": "Component",
                        "value": f"{alert.component_name}@{alert.component_version}",
                        "short": True
                    },
                    {
                        "title": "Severity",
                        "value": alert.severity.value.upper(),
                        "short": True
                    },
                    {
                        "title": "Impact",
                        "value": alert.impact_assessment,
                        "short": False
                    },
                    {
                        "title": "Recommended Actions",
                        "value": "\n".join([f"• {action}" for action in alert.recommended_actions]),
                        "short": False
                    }
                ],
                "footer": "GamifyX SBOM Security Monitor",
                "ts": int(alert.timestamp.timestamp())
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.webhook_url, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Slack notification failed: {response.status}")

class EmailNotifier:
    def __init__(self, config: Dict[str, Any]):
        self.smtp_server = config.get('smtp_server')
        self.smtp_port = config.get('smtp_port', 587)
        self.username = config.get('username')
        self.password = config.get('password')
        self.from_address = config.get('from_address')
        self.to_addresses = config.get('to_addresses', [])
        
    async def send_notification(self, alert: SecurityAlert):
        if not all([self.smtp_server, self.username, self.password, self.from_address]):
            return
        
        subject = f"[{alert.severity.value.upper()}] {alert.title}"
        
        body = f"""
Security Alert: {alert.title}

Component: {alert.component_name}@{alert.component_version}
Severity: {alert.severity.value.upper()}
Event Type: {alert.event_type.value}
Timestamp: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}

Description:
{alert.description}

Impact Assessment:
{alert.impact_assessment}

Recommended Actions:
{chr(10).join([f"• {action}" for action in alert.recommended_actions])}

Affected Systems:
{chr(10).join([f"• {system}" for system in alert.affected_systems])}

Alert ID: {alert.id}

--
GamifyX SBOM Security Monitor
        """
        
        msg = MIMEMultipart()
        msg['From'] = self.from_address
        msg['To'] = ', '.join(self.to_addresses)
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            await loop.run_in_executor(executor, self._send_email, msg)
    
    def _send_email(self, msg):
        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)

class WebhookNotifier:
    def __init__(self, config: Dict[str, Any]):
        self.webhook_url = config.get('url')
        self.headers = config.get('headers', {})
        
    async def send_notification(self, alert: SecurityAlert):
        if not self.webhook_url:
            return
        
        payload = asdict(alert)
        payload['timestamp'] = alert.timestamp.isoformat()
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.webhook_url, 
                json=payload, 
                headers=self.headers
            ) as response:
                if response.status not in [200, 201, 202]:
                    raise Exception(f"Webhook notification failed: {response.status}")

class PagerDutyNotifier:
    def __init__(self, config: Dict[str, Any]):
        self.integration_key = config.get('integration_key')
        self.api_url = "https://events.pagerduty.com/v2/enqueue"
        
    async def send_notification(self, alert: SecurityAlert):
        if not self.integration_key:
            return
        
        # Only send to PagerDuty for critical and emergency alerts
        if alert.severity not in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]:
            return
        
        payload = {
            "routing_key": self.integration_key,
            "event_action": "trigger",
            "dedup_key": alert.id,
            "payload": {
                "summary": alert.title,
                "source": f"{alert.component_name}@{alert.component_version}",
                "severity": alert.severity.value,
                "component": alert.component_name,
                "group": "SBOM Security",
                "class": alert.event_type.value,
                "custom_details": {
                    "description": alert.description,
                    "impact_assessment": alert.impact_assessment,
                    "recommended_actions": alert.recommended_actions,
                    "affected_systems": alert.affected_systems,
                    "metadata": alert.metadata
                }
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.api_url, json=payload) as response:
                if response.status != 202:
                    raise Exception(f"PagerDuty notification failed: {response.status}")

async def main():
    """Main function for running continuous monitoring"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Continuous SBOM Security Monitoring")
    parser.add_argument("--config", required=True, help="Configuration file")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    
    args = parser.parse_args()
    
    # Initialize monitor
    monitor = ContinuousMonitor(args.config)
    
    try:
        # Start monitoring
        await monitor.start_monitoring()
        
        if args.daemon:
            # Run indefinitely
            while True:
                await asyncio.sleep(1)
        else:
            # Run for a short time for testing
            await asyncio.sleep(60)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await monitor.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())