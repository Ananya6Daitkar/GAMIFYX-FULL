export interface SecurityMetrics {
  id: string;
  timestamp: Date;
  vulnerabilities: VulnerabilityMetrics;
  threats: ThreatMetrics;
  compliance: ComplianceMetrics;
  incidents: IncidentMetrics;
  access: AccessMetrics;
  training: TrainingMetrics;
}

export interface VulnerabilityMetrics {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  pending: number;
  averageResolutionTime: number; // in hours
  newThisWeek: number;
  trendDirection: 'up' | 'down' | 'stable';
}

export interface ThreatMetrics {
  activeThreats: number;
  blockedAttacks: number;
  suspiciousActivities: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  topThreatTypes: Array<{ type: string; count: number }>;
  geographicDistribution: Array<{ country: string; count: number }>;
}

export interface ComplianceMetrics {
  overallScore: number; // 0-100
  nist80053: ComplianceFramework;
  cisControls: ComplianceFramework;
  gdpr: ComplianceFramework;
  sox: ComplianceFramework;
  lastAuditDate: Date;
  nextAuditDate: Date;
  openFindings: number;
  resolvedFindings: number;
}

export interface ComplianceFramework {
  score: number; // 0-100
  totalControls: number;
  implementedControls: number;
  partiallyImplemented: number;
  notImplemented: number;
  lastAssessment: Date;
}

export interface IncidentMetrics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  averageResolutionTime: number; // in hours
  incidentsByType: Array<{ type: string; count: number }>;
  incidentsBySeverity: Array<{ severity: string; count: number }>;
  mttr: number; // Mean Time To Resolution in hours
  mtbf: number; // Mean Time Between Failures in hours
}

export interface AccessMetrics {
  totalUsers: number;
  activeUsers: number;
  privilegedUsers: number;
  mfaEnabled: number;
  failedLogins: number;
  suspiciousLogins: number;
  passwordExpiring: number;
  dormantAccounts: number;
}

export interface TrainingMetrics {
  totalUsers: number;
  completedTraining: number;
  pendingTraining: number;
  overdue: number;
  averageScore: number;
  phishingTestResults: PhishingMetrics;
  lastTrainingDate: Date;
  nextTrainingDate: Date;
}

export interface PhishingMetrics {
  totalTests: number;
  clicked: number;
  reported: number;
  ignored: number;
  clickRate: number; // percentage
}

export interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: AlertStatus;
  assignedTo?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  metadata: Record<string, any>;
}

export enum AlertType {
  VULNERABILITY = 'vulnerability',
  THREAT = 'threat',
  COMPLIANCE = 'compliance',
  INCIDENT = 'incident',
  ACCESS = 'access',
  TRAINING = 'training',
  SYSTEM = 'system'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  FALSE_POSITIVE = 'false_positive'
}

export interface Vulnerability {
  id: string;
  cveId?: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvssScore: number;
  component: string;
  version: string;
  fixedVersion?: string;
  discoveredAt: Date;
  status: VulnerabilityStatus;
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  source: string; // trivy, snyk, etc.
  references: string[];
}

export enum VulnerabilitySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum VulnerabilityStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ACCEPTED_RISK = 'accepted_risk',
  FALSE_POSITIVE = 'false_positive'
}

export interface ThreatIntelligence {
  id: string;
  type: ThreatType;
  indicator: string;
  confidence: number; // 0-100
  severity: ThreatSeverity;
  description: string;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  isActive: boolean;
  tags: string[];
  iocs: Array<{ type: string; value: string }>; // Indicators of Compromise
}

export enum ThreatType {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  BOTNET = 'botnet',
  APT = 'apt',
  DDOS = 'ddos',
  BRUTE_FORCE = 'brute_force',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  INSIDER_THREAT = 'insider_threat'
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy: string;
  assignedTo?: string;
  reportedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  timeline: IncidentTimelineEntry[];
  affectedSystems: string[];
  impactAssessment: ImpactAssessment;
  rootCause?: string;
  lessonsLearned?: string;
  preventiveMeasures?: string[];
}

export enum IncidentType {
  DATA_BREACH = 'data_breach',
  MALWARE = 'malware',
  PHISHING = 'phishing',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SYSTEM_COMPROMISE = 'system_compromise',
  DENIAL_OF_SERVICE = 'denial_of_service',
  INSIDER_THREAT = 'insider_threat',
  POLICY_VIOLATION = 'policy_violation'
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  REPORTED = 'reported',
  ACKNOWLEDGED = 'acknowledged',
  INVESTIGATING = 'investigating',
  CONTAINING = 'containing',
  ERADICATING = 'eradicating',
  RECOVERING = 'recovering',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: Date;
  action: string;
  description: string;
  performedBy: string;
  evidence?: string[];
}

export interface ImpactAssessment {
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  financialImpact: number;
  reputationalImpact: ImpactLevel;
  affectedUsers: number;
  downtime: number; // in minutes
}

export enum ImpactLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityReport {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  generatedAt: Date;
  generatedBy: string;
  period: ReportPeriod;
  format: ReportFormat;
  data: any;
  recipients: string[];
  scheduledDelivery?: Date;
  isScheduled: boolean;
}

export enum ReportType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  VULNERABILITY_REPORT = 'vulnerability_report',
  THREAT_INTELLIGENCE = 'threat_intelligence',
  COMPLIANCE_REPORT = 'compliance_report',
  INCIDENT_REPORT = 'incident_report',
  TRAINING_REPORT = 'training_report',
  RISK_ASSESSMENT = 'risk_assessment'
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel'
}

export interface SecurityKPI {
  id: string;
  name: string;
  category: KPICategory;
  value: number;
  target: number;
  unit: string;
  trend: TrendDirection;
  lastUpdated: Date;
  description: string;
  formula?: string;
}

export enum KPICategory {
  VULNERABILITY_MANAGEMENT = 'vulnerability_management',
  THREAT_DETECTION = 'threat_detection',
  INCIDENT_RESPONSE = 'incident_response',
  COMPLIANCE = 'compliance',
  ACCESS_MANAGEMENT = 'access_management',
  TRAINING = 'training',
  RISK_MANAGEMENT = 'risk_management'
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable'
}

export interface SecurityBenchmark {
  id: string;
  framework: string; // NIST, CIS, ISO27001, etc.
  category: string;
  control: string;
  description: string;
  currentScore: number;
  targetScore: number;
  industryAverage: number;
  lastAssessed: Date;
  assessor: string;
  evidence: string[];
  recommendations: string[];
}

export interface RiskAssessment {
  id: string;
  assetId: string;
  assetName: string;
  assetType: string;
  threats: RiskThreat[];
  vulnerabilities: RiskVulnerability[];
  riskScore: number;
  riskLevel: RiskLevel;
  mitigations: RiskMitigation[];
  residualRisk: number;
  assessedBy: string;
  assessedAt: Date;
  nextReview: Date;
}

export interface RiskThreat {
  id: string;
  name: string;
  description: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  riskScore: number; // likelihood * impact
}

export interface RiskVulnerability {
  id: string;
  name: string;
  description: string;
  exploitability: number; // 1-5
  impact: number; // 1-5
  riskScore: number;
}

export interface RiskMitigation {
  id: string;
  name: string;
  description: string;
  effectiveness: number; // 0-100%
  cost: number;
  implementationDate?: Date;
  status: MitigationStatus;
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum MitigationStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  VERIFIED = 'verified',
  DEFERRED = 'deferred'
}