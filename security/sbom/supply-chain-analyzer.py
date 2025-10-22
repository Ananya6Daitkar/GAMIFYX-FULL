#!/usr/bin/env python3
"""
supply-chain-analyzer.py - Advanced supply chain security analysis for SBOM components
Analyzes supply chain risks, dependency relationships, and security posture
"""

import json
import yaml
import asyncio
import aiohttp
import logging
import sqlite3
import networkx as nx
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import hashlib
import requests
import numpy as np
import pandas as pd
from packaging import version
import semver
import re
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SupplyChainRisk(Enum):
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TrustLevel(Enum):
    VERIFIED = "verified"
    TRUSTED = "trusted"
    NEUTRAL = "neutral"
    SUSPICIOUS = "suspicious"
    UNTRUSTED = "untrusted"

class DependencyType(Enum):
    DIRECT = "direct"
    TRANSITIVE = "transitive"
    DEV = "dev"
    PEER = "peer"
    OPTIONAL = "optional"

@dataclass
class SupplyChainNode:
    """Represents a node in the supply chain graph"""
    id: str
    name: str
    version: str
    package_manager: str
    dependency_type: DependencyType
    trust_level: TrustLevel
    risk_score: float
    maintainer_info: Dict[str, Any]
    repository_info: Dict[str, Any]
    security_metrics: Dict[str, Any]
    metadata: Dict[str, Any]

@dataclass
class SupplyChainEdge:
    """Represents a dependency relationship in the supply chain"""
    source_id: str
    target_id: str
    dependency_type: DependencyType
    version_constraint: str
    introduced_by: Optional[str]
    risk_contribution: float

@dataclass
class SupplyChainAnalysis:
    """Complete supply chain analysis results"""
    analysis_id: str
    timestamp: datetime
    total_nodes: int
    total_edges: int
    max_depth: int
    risk_distribution: Dict[str, int]
    trust_distribution: Dict[str, int]
    critical_paths: List[List[str]]
    vulnerable_paths: List[List[str]]
    orphaned_dependencies: List[str]
    circular_dependencies: List[List[str]]
    single_points_of_failure: List[str]
    supply_chain_score: float
    recommendations: List[str]
    nodes: List[SupplyChainNode]
    edges: List[SupplyChainEdge]

class SupplyChainAnalyzer:
    """Advanced supply chain security analyzer"""
    
    def __init__(self, config_file: str):
        self.config = self._load_config(config_file)
        self.db_path = Path(self.config.get('database_path', 'security/sbom/supply_chain.db'))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        
        # Initialize external data sources
        self.package_registries = {
            'npm': NPMRegistryClient(),
            'pypi': PyPIRegistryClient(),
            'maven': MavenRegistryClient(),
            'nuget': NuGetRegistryClient(),
            'rubygems': RubyGemsRegistryClient()
        }
        
        # Initialize security intelligence sources
        self.security_sources = {
            'github': GitHubSecurityClient(self.config.get('github_token')),
            'snyk': SnykClient(self.config.get('snyk_token')),
            'sonatype': SonatypeClient(),
            'deps_dev': DepsDevClient()
        }
        
        # Trust and reputation databases
        self.trust_databases = {
            'openssf': OpenSSFClient(),
            'sigstore': SigstoreClient(),
            'npm_audit': NPMAuditClient()
        }
        
    def _load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            return yaml.safe_load(f)
    
    def _init_database(self):
        """Initialize supply chain analysis database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS supply_chain_analyses (
                    id TEXT PRIMARY KEY,
                    timestamp DATETIME,
                    sbom_hash TEXT,
                    total_nodes INTEGER,
                    total_edges INTEGER,
                    max_depth INTEGER,
                    supply_chain_score REAL,
                    analysis_data TEXT
                );
                
                CREATE TABLE IF NOT EXISTS supply_chain_nodes (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT,
                    name TEXT,
                    version TEXT,
                    package_manager TEXT,
                    dependency_type TEXT,
                    trust_level TEXT,
                    risk_score REAL,
                    maintainer_info TEXT,
                    repository_info TEXT,
                    security_metrics TEXT,
                    metadata TEXT,
                    FOREIGN KEY (analysis_id) REFERENCES supply_chain_analyses (id)
                );
                
                CREATE TABLE IF NOT EXISTS supply_chain_edges (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT,
                    source_id TEXT,
                    target_id TEXT,
                    dependency_type TEXT,
                    version_constraint TEXT,
                    introduced_by TEXT,
                    risk_contribution REAL,
                    FOREIGN KEY (analysis_id) REFERENCES supply_chain_analyses (id)
                );
                
                CREATE TABLE IF NOT EXISTS maintainer_reputation (
                    maintainer_id TEXT PRIMARY KEY,
                    name TEXT,
                    email TEXT,
                    reputation_score REAL,
                    package_count INTEGER,
                    total_downloads INTEGER,
                    security_incidents INTEGER,
                    last_updated DATETIME
                );
                
                CREATE TABLE IF NOT EXISTS package_intelligence (
                    package_id TEXT PRIMARY KEY,
                    name TEXT,
                    package_manager TEXT,
                    intelligence_data TEXT,
                    last_updated DATETIME
                );
                
                CREATE INDEX IF NOT EXISTS idx_nodes_analysis ON supply_chain_nodes(analysis_id);
                CREATE INDEX IF NOT EXISTS idx_edges_analysis ON supply_chain_edges(analysis_id);
                CREATE INDEX IF NOT EXISTS idx_maintainer_name ON maintainer_reputation(name);
                CREATE INDEX IF NOT EXISTS idx_package_name ON package_intelligence(name, package_manager);
            """)
    
    async def analyze_supply_chain(self, sbom_data: Dict[str, Any]) -> SupplyChainAnalysis:
        """Perform comprehensive supply chain analysis"""
        logger.info("Starting supply chain security analysis...")
        
        analysis_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)
        
        # Build dependency graph
        graph = await self._build_dependency_graph(sbom_data)
        
        # Analyze nodes (components)
        nodes = await self._analyze_nodes(graph)
        
        # Analyze edges (dependencies)
        edges = await self._analyze_edges(graph)
        
        # Perform graph analysis
        analysis_results = await self._perform_graph_analysis(graph, nodes, edges)
        
        # Calculate supply chain score
        supply_chain_score = self._calculate_supply_chain_score(nodes, edges, analysis_results)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(analysis_results, nodes, edges)
        
        # Create analysis object
        analysis = SupplyChainAnalysis(
            analysis_id=analysis_id,
            timestamp=timestamp,
            total_nodes=len(nodes),
            total_edges=len(edges),
            max_depth=analysis_results['max_depth'],
            risk_distribution=analysis_results['risk_distribution'],
            trust_distribution=analysis_results['trust_distribution'],
            critical_paths=analysis_results['critical_paths'],
            vulnerable_paths=analysis_results['vulnerable_paths'],
            orphaned_dependencies=analysis_results['orphaned_dependencies'],
            circular_dependencies=analysis_results['circular_dependencies'],
            single_points_of_failure=analysis_results['single_points_of_failure'],
            supply_chain_score=supply_chain_score,
            recommendations=recommendations,
            nodes=nodes,
            edges=edges
        )
        
        # Store analysis results
        await self._store_analysis(analysis)
        
        logger.info(f"Supply chain analysis completed. Score: {supply_chain_score:.2f}")
        return analysis
    
    async def _build_dependency_graph(self, sbom_data: Dict[str, Any]) -> nx.DiGraph:
        """Build dependency graph from SBOM data"""
        graph = nx.DiGraph()
        
        # Extract components
        components = self._extract_components(sbom_data)
        
        # Add nodes to graph
        for component in components:
            node_id = f"{component.get('name', '')}@{component.get('version', '')}"
            graph.add_node(node_id, **component)
        
        # Extract and add dependency relationships
        dependencies = self._extract_dependencies(sbom_data)
        
        for dep in dependencies:
            source = dep.get('source')
            target = dep.get('target')
            if source and target and graph.has_node(source) and graph.has_node(target):
                graph.add_edge(source, target, **dep)
        
        # Enrich with external dependency data
        await self._enrich_dependency_graph(graph)
        
        return graph
    
    def _extract_components(self, sbom_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract components from SBOM data"""
        components = []
        
        # Handle CycloneDX format
        if sbom_data.get('bomFormat') == 'CycloneDX':
            for component in sbom_data.get('components', []):
                components.append({
                    'name': component.get('name'),
                    'version': component.get('version'),
                    'type': component.get('type'),
                    'purl': component.get('purl'),
                    'scope': component.get('scope', 'required'),
                    'licenses': component.get('licenses', []),
                    'hashes': component.get('hashes', [])
                })
        
        # Handle SPDX format
        elif sbom_data.get('spdxVersion'):
            for package in sbom_data.get('packages', []):
                components.append({
                    'name': package.get('name'),
                    'version': package.get('versionInfo', 'unknown'),
                    'type': 'library',
                    'downloadLocation': package.get('downloadLocation'),
                    'licenseConcluded': package.get('licenseConcluded'),
                    'copyrightText': package.get('copyrightText')
                })
        
        return components
    
    def _extract_dependencies(self, sbom_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract dependency relationships from SBOM data"""
        dependencies = []
        
        # Handle CycloneDX format
        if sbom_data.get('bomFormat') == 'CycloneDX':
            for dep_info in sbom_data.get('dependencies', []):
                source = dep_info.get('ref')
                for target in dep_info.get('dependsOn', []):
                    dependencies.append({
                        'source': source,
                        'target': target,
                        'type': 'depends_on'
                    })
        
        # Handle SPDX format
        elif sbom_data.get('spdxVersion'):
            for relationship in sbom_data.get('relationships', []):
                if relationship.get('relationshipType') == 'DEPENDS_ON':
                    dependencies.append({
                        'source': relationship.get('spdxElementId'),
                        'target': relationship.get('relatedSpdxElement'),
                        'type': 'depends_on'
                    })
        
        return dependencies
    
    async def _enrich_dependency_graph(self, graph: nx.DiGraph):
        """Enrich dependency graph with external data"""
        tasks = []
        
        for node_id in graph.nodes():
            node_data = graph.nodes[node_id]
            task = self._enrich_node_data(node_id, node_data)
            tasks.append(task)
        
        # Process in batches to avoid overwhelming APIs
        batch_size = 10
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            enriched_data = await asyncio.gather(*batch, return_exceptions=True)
            
            for j, data in enumerate(enriched_data):
                if isinstance(data, dict):
                    node_id = list(graph.nodes())[i + j]
                    graph.nodes[node_id].update(data)
    
    async def _enrich_node_data(self, node_id: str, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich individual node with external data"""
        enriched = {}
        
        name = node_data.get('name', '')
        version = node_data.get('version', '')
        purl = node_data.get('purl', '')
        
        # Determine package manager
        package_manager = self._extract_package_manager(purl)
        
        try:
            # Get package registry information
            if package_manager in self.package_registries:
                registry_client = self.package_registries[package_manager]
                registry_info = await registry_client.get_package_info(name, version)
                enriched['registry_info'] = registry_info
            
            # Get security information
            security_info = await self._get_security_information(name, version, package_manager)
            enriched['security_info'] = security_info
            
            # Get trust and reputation information
            trust_info = await self._get_trust_information(name, version, package_manager)
            enriched['trust_info'] = trust_info
            
        except Exception as e:
            logger.warning(f"Error enriching node {node_id}: {e}")
        
        return enriched
    
    async def _analyze_nodes(self, graph: nx.DiGraph) -> List[SupplyChainNode]:
        """Analyze all nodes in the dependency graph"""
        nodes = []
        
        for node_id in graph.nodes():
            node_data = graph.nodes[node_id]
            
            # Extract basic information
            name = node_data.get('name', '')
            version = node_data.get('version', '')
            purl = node_data.get('purl', '')
            package_manager = self._extract_package_manager(purl)
            
            # Determine dependency type
            dependency_type = self._determine_dependency_type(node_data, graph, node_id)
            
            # Calculate trust level
            trust_level = self._calculate_trust_level(node_data)
            
            # Calculate risk score
            risk_score = self._calculate_node_risk_score(node_data, graph, node_id)
            
            # Extract maintainer information
            maintainer_info = self._extract_maintainer_info(node_data)
            
            # Extract repository information
            repository_info = self._extract_repository_info(node_data)
            
            # Extract security metrics
            security_metrics = self._extract_security_metrics(node_data)
            
            # Create node
            node = SupplyChainNode(
                id=node_id,
                name=name,
                version=version,
                package_manager=package_manager,
                dependency_type=dependency_type,
                trust_level=trust_level,
                risk_score=risk_score,
                maintainer_info=maintainer_info,
                repository_info=repository_info,
                security_metrics=security_metrics,
                metadata=node_data
            )
            
            nodes.append(node)
        
        return nodes
    
    async def _analyze_edges(self, graph: nx.DiGraph) -> List[SupplyChainEdge]:
        """Analyze all edges in the dependency graph"""
        edges = []
        
        for source, target in graph.edges():
            edge_data = graph.edges[source, target]
            
            # Determine dependency type
            dependency_type = DependencyType(edge_data.get('type', 'direct'))
            
            # Extract version constraint
            version_constraint = edge_data.get('version_constraint', '*')
            
            # Determine what introduced this dependency
            introduced_by = self._find_dependency_introducer(graph, source, target)
            
            # Calculate risk contribution
            risk_contribution = self._calculate_edge_risk_contribution(graph, source, target)
            
            # Create edge
            edge = SupplyChainEdge(
                source_id=source,
                target_id=target,
                dependency_type=dependency_type,
                version_constraint=version_constraint,
                introduced_by=introduced_by,
                risk_contribution=risk_contribution
            )
            
            edges.append(edge)
        
        return edges
    
    async def _perform_graph_analysis(self, graph: nx.DiGraph, nodes: List[SupplyChainNode], edges: List[SupplyChainEdge]) -> Dict[str, Any]:
        """Perform comprehensive graph analysis"""
        results = {}
        
        # Calculate graph metrics
        results['max_depth'] = self._calculate_max_depth(graph)
        results['average_degree'] = sum(dict(graph.degree()).values()) / len(graph.nodes()) if graph.nodes() else 0
        
        # Risk and trust distributions
        results['risk_distribution'] = self._calculate_risk_distribution(nodes)
        results['trust_distribution'] = self._calculate_trust_distribution(nodes)
        
        # Find critical paths
        results['critical_paths'] = self._find_critical_paths(graph, nodes)
        
        # Find vulnerable paths
        results['vulnerable_paths'] = self._find_vulnerable_paths(graph, nodes)
        
        # Find orphaned dependencies
        results['orphaned_dependencies'] = self._find_orphaned_dependencies(graph)
        
        # Find circular dependencies
        results['circular_dependencies'] = self._find_circular_dependencies(graph)
        
        # Find single points of failure
        results['single_points_of_failure'] = self._find_single_points_of_failure(graph)
        
        # Calculate centrality measures
        results['betweenness_centrality'] = nx.betweenness_centrality(graph)
        results['closeness_centrality'] = nx.closeness_centrality(graph)
        results['pagerank'] = nx.pagerank(graph)
        
        return results
    
    def _calculate_supply_chain_score(self, nodes: List[SupplyChainNode], edges: List[SupplyChainEdge], analysis_results: Dict[str, Any]) -> float:
        """Calculate overall supply chain security score"""
        if not nodes:
            return 0.0
        
        # Base score from node risk scores
        node_scores = [10.0 - node.risk_score for node in nodes]  # Invert risk to get security score
        base_score = sum(node_scores) / len(node_scores)
        
        # Penalties for structural issues
        penalties = 0.0
        
        # Penalty for circular dependencies
        if analysis_results['circular_dependencies']:
            penalties += len(analysis_results['circular_dependencies']) * 0.5
        
        # Penalty for single points of failure
        if analysis_results['single_points_of_failure']:
            penalties += len(analysis_results['single_points_of_failure']) * 0.3
        
        # Penalty for orphaned dependencies
        if analysis_results['orphaned_dependencies']:
            penalties += len(analysis_results['orphaned_dependencies']) * 0.2
        
        # Penalty for high-risk nodes
        high_risk_nodes = [n for n in nodes if n.risk_score > 7.0]
        if high_risk_nodes:
            penalties += len(high_risk_nodes) * 0.4
        
        # Penalty for untrusted nodes
        untrusted_nodes = [n for n in nodes if n.trust_level == TrustLevel.UNTRUSTED]
        if untrusted_nodes:
            penalties += len(untrusted_nodes) * 0.6
        
        # Calculate final score
        final_score = max(0.0, min(10.0, base_score - penalties))
        
        return final_score
    
    def _generate_recommendations(self, analysis_results: Dict[str, Any], nodes: List[SupplyChainNode], edges: List[SupplyChainEdge]) -> List[str]:
        """Generate security recommendations based on analysis"""
        recommendations = []
        
        # High-risk components
        high_risk_nodes = [n for n in nodes if n.risk_score > 7.0]
        if high_risk_nodes:
            recommendations.append(
                f"CRITICAL: {len(high_risk_nodes)} components have high supply chain risk. "
                f"Review and consider alternatives for: {', '.join([n.name for n in high_risk_nodes[:3]])}"
            )
        
        # Untrusted components
        untrusted_nodes = [n for n in nodes if n.trust_level == TrustLevel.UNTRUSTED]
        if untrusted_nodes:
            recommendations.append(
                f"SECURITY: {len(untrusted_nodes)} components are untrusted. "
                f"Verify authenticity and consider removal: {', '.join([n.name for n in untrusted_nodes[:3]])}"
            )
        
        # Circular dependencies
        if analysis_results['circular_dependencies']:
            recommendations.append(
                f"ARCHITECTURE: {len(analysis_results['circular_dependencies'])} circular dependencies detected. "
                "Refactor to eliminate circular references and reduce complexity."
            )
        
        # Single points of failure
        if analysis_results['single_points_of_failure']:
            recommendations.append(
                f"RESILIENCE: {len(analysis_results['single_points_of_failure'])} single points of failure identified. "
                "Consider alternative packages or implement redundancy."
            )
        
        # Orphaned dependencies
        if analysis_results['orphaned_dependencies']:
            recommendations.append(
                f"CLEANUP: {len(analysis_results['orphaned_dependencies'])} orphaned dependencies found. "
                "Remove unused dependencies to reduce attack surface."
            )
        
        # Deep dependency chains
        if analysis_results['max_depth'] > 10:
            recommendations.append(
                f"COMPLEXITY: Dependency chain depth is {analysis_results['max_depth']}. "
                "Consider flattening dependencies to reduce supply chain complexity."
            )
        
        # General recommendations
        recommendations.extend([
            "Implement dependency pinning with exact versions for critical components",
            "Set up automated dependency scanning and vulnerability monitoring",
            "Establish a software bill of materials (SBOM) generation process",
            "Create a dependency approval process for new packages",
            "Implement package signature verification where available",
            "Regular audit and cleanup of unused dependencies"
        ])
        
        return recommendations
    
    def generate_supply_chain_visualization(self, analysis: SupplyChainAnalysis, output_file: str):
        """Generate comprehensive supply chain visualization"""
        # Create subplots
        fig = make_subplots(
            rows=2, cols=3,
            subplot_titles=[
                'Dependency Graph', 'Risk Distribution', 'Trust Distribution',
                'Component Types', 'Vulnerability Paths', 'Centrality Analysis'
            ],
            specs=[
                [{"type": "scatter"}, {"type": "bar"}, {"type": "pie"}],
                [{"type": "bar"}, {"type": "scatter"}, {"type": "bar"}]
            ]
        )
        
        # 1. Dependency Graph (simplified for visualization)
        self._add_dependency_graph_plot(fig, analysis, row=1, col=1)
        
        # 2. Risk Distribution
        self._add_risk_distribution_plot(fig, analysis, row=1, col=2)
        
        # 3. Trust Distribution
        self._add_trust_distribution_plot(fig, analysis, row=1, col=3)
        
        # 4. Component Types
        self._add_component_types_plot(fig, analysis, row=2, col=1)
        
        # 5. Vulnerability Paths
        self._add_vulnerability_paths_plot(fig, analysis, row=2, col=2)
        
        # 6. Centrality Analysis
        self._add_centrality_analysis_plot(fig, analysis, row=2, col=3)
        
        # Update layout
        fig.update_layout(
            title_text=f"Supply Chain Security Analysis - Score: {analysis.supply_chain_score:.2f}/10",
            showlegend=True,
            height=800,
            width=1200
        )
        
        # Save visualization
        fig.write_html(output_file)
        logger.info(f"Supply chain visualization saved to {output_file}")
    
    def export_supply_chain_report(self, analysis: SupplyChainAnalysis, output_file: str, format: str = 'json'):
        """Export supply chain analysis report"""
        if format.lower() == 'json':
            with open(output_file, 'w') as f:
                json.dump(asdict(analysis), f, indent=2, default=str)
        
        elif format.lower() == 'html':
            self._export_html_report(analysis, output_file)
        
        elif format.lower() == 'csv':
            self._export_csv_report(analysis, output_file)
        
        logger.info(f"Supply chain report exported to {output_file}")
    
    # Helper methods for calculations and analysis
    def _extract_package_manager(self, purl: str) -> str:
        """Extract package manager from PURL"""
        if not purl:
            return 'unknown'
        
        if purl.startswith('pkg:npm/'):
            return 'npm'
        elif purl.startswith('pkg:pypi/'):
            return 'pypi'
        elif purl.startswith('pkg:maven/'):
            return 'maven'
        elif purl.startswith('pkg:nuget/'):
            return 'nuget'
        elif purl.startswith('pkg:gem/'):
            return 'rubygems'
        else:
            return 'unknown'
    
    def _determine_dependency_type(self, node_data: Dict[str, Any], graph: nx.DiGraph, node_id: str) -> DependencyType:
        """Determine the type of dependency"""
        scope = node_data.get('scope', 'required')
        
        if scope == 'optional':
            return DependencyType.OPTIONAL
        elif scope == 'dev':
            return DependencyType.DEV
        
        # Check if it's a direct dependency (has no incoming edges from other dependencies)
        predecessors = list(graph.predecessors(node_id))
        if not predecessors:
            return DependencyType.DIRECT
        else:
            return DependencyType.TRANSITIVE
    
    def _calculate_trust_level(self, node_data: Dict[str, Any]) -> TrustLevel:
        """Calculate trust level for a component"""
        trust_info = node_data.get('trust_info', {})
        
        # Check for verified signatures
        if trust_info.get('signed', False):
            return TrustLevel.VERIFIED
        
        # Check maintainer reputation
        maintainer_score = trust_info.get('maintainer_reputation', 0.5)
        if maintainer_score > 0.8:
            return TrustLevel.TRUSTED
        elif maintainer_score < 0.3:
            return TrustLevel.SUSPICIOUS
        
        # Check for security incidents
        security_incidents = trust_info.get('security_incidents', 0)
        if security_incidents > 3:
            return TrustLevel.UNTRUSTED
        
        return TrustLevel.NEUTRAL
    
    def _calculate_node_risk_score(self, node_data: Dict[str, Any], graph: nx.DiGraph, node_id: str) -> float:
        """Calculate risk score for a node"""
        risk_score = 0.0
        
        # Security vulnerabilities
        security_info = node_data.get('security_info', {})
        vuln_count = security_info.get('vulnerability_count', 0)
        critical_vulns = security_info.get('critical_vulnerabilities', 0)
        
        risk_score += critical_vulns * 2.0
        risk_score += vuln_count * 0.5
        
        # Maintainer factors
        registry_info = node_data.get('registry_info', {})
        
        # Age factor (very new or very old packages are riskier)
        age_days = registry_info.get('age_days', 365)
        if age_days < 30:
            risk_score += 1.0
        elif age_days > 2000:  # > 5 years
            risk_score += 0.5
        
        # Download count (very low downloads are riskier)
        downloads = registry_info.get('downloads', 0)
        if downloads < 1000:
            risk_score += 1.0
        elif downloads < 10000:
            risk_score += 0.5
        
        # Maintainer count (single maintainer is riskier)
        maintainer_count = len(registry_info.get('maintainers', []))
        if maintainer_count == 1:
            risk_score += 0.5
        elif maintainer_count == 0:
            risk_score += 1.0
        
        # Dependency depth (deeper dependencies are riskier)
        try:
            depth = nx.shortest_path_length(graph, source=list(graph.nodes())[0], target=node_id)
            risk_score += depth * 0.1
        except:
            pass
        
        return min(risk_score, 10.0)  # Cap at 10
    
    # Placeholder methods for external service clients
    async def _get_security_information(self, name: str, version: str, package_manager: str) -> Dict[str, Any]:
        """Get security information from various sources"""
        return {
            'vulnerability_count': 0,
            'critical_vulnerabilities': 0,
            'security_advisories': []
        }
    
    async def _get_trust_information(self, name: str, version: str, package_manager: str) -> Dict[str, Any]:
        """Get trust and reputation information"""
        return {
            'signed': False,
            'maintainer_reputation': 0.5,
            'security_incidents': 0
        }

# Placeholder classes for external service clients
class NPMRegistryClient:
    async def get_package_info(self, name: str, version: str) -> Dict[str, Any]:
        return {}

class PyPIRegistryClient:
    async def get_package_info(self, name: str, version: str) -> Dict[str, Any]:
        return {}

class MavenRegistryClient:
    async def get_package_info(self, name: str, version: str) -> Dict[str, Any]:
        return {}

class NuGetRegistryClient:
    async def get_package_info(self, name: str, version: str) -> Dict[str, Any]:
        return {}

class RubyGemsRegistryClient:
    async def get_package_info(self, name: str, version: str) -> Dict[str, Any]:
        return {}

class GitHubSecurityClient:
    def __init__(self, token: str):
        self.token = token

class SnykClient:
    def __init__(self, token: str):
        self.token = token

class SonatypeClient:
    pass

class DepsDevClient:
    pass

class OpenSSFClient:
    pass

class SigstoreClient:
    pass

class NPMAuditClient:
    pass

async def main():
    """Main function for CLI usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Supply Chain Security Analyzer")
    parser.add_argument("--config", required=True, help="Configuration file")
    parser.add_argument("--sbom-file", required=True, help="SBOM file to analyze")
    parser.add_argument("--output-dir", default="security/reports", help="Output directory")
    parser.add_argument("--format", choices=['json', 'html', 'csv'], default='json', help="Report format")
    parser.add_argument("--visualization", action="store_true", help="Generate visualization")
    
    args = parser.parse_args()
    
    # Initialize analyzer
    analyzer = SupplyChainAnalyzer(args.config)
    
    # Load SBOM data
    with open(args.sbom_file, 'r') as f:
        sbom_data = json.load(f)
    
    # Perform analysis
    analysis = await analyzer.analyze_supply_chain(sbom_data)
    
    # Export report
    output_file = f"{args.output_dir}/supply-chain-analysis.{args.format}"
    analyzer.export_supply_chain_report(analysis, output_file, args.format)
    
    # Generate visualization if requested
    if args.visualization:
        viz_file = f"{args.output_dir}/supply-chain-visualization.html"
        analyzer.generate_supply_chain_visualization(analysis, viz_file)
    
    logger.info(f"Supply chain analysis completed. Score: {analysis.supply_chain_score:.2f}")

if __name__ == "__main__":
    asyncio.run(main())