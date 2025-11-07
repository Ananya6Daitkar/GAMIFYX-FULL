export interface GuardrailPolicy {
  id: string;
  name: string;
  type: 'Bias Detection' | 'Content Filter' | 'Compliance Check' | 'Safety Monitor';
  description?: string;
  rules: Record<string, any>;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  action: 'Log' | 'Block' | 'Modify' | 'Alert';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateGuardrailPolicyRequest {
  name: string;
  type: 'Bias Detection' | 'Content Filter' | 'Compliance Check' | 'Safety Monitor';
  description?: string;
  rules: Record<string, any>;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  action: 'Log' | 'Block' | 'Modify' | 'Alert';
  createdBy?: string;
}

export interface UpdateGuardrailPolicyRequest {
  name?: string;
  description?: string;
  rules?: Record<string, any>;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  action?: 'Log' | 'Block' | 'Modify' | 'Alert';
  isActive?: boolean;
  updatedBy?: string;
}

export interface BiasDetectionResult {
  id: string;
  policyId: string;
  contentHash: string;
  biasType: 'Gender' | 'Race' | 'Age' | 'Religion' | 'Nationality' | 'Disability' | 'Sexual Orientation' | 'Other';
  biasScore?: number;
  confidenceScore?: number;
  detectedTerms?: string[];
  contextAnalysis?: Record<string, any>;
  demographicParity?: number;
  equalizedOdds?: number;
  actionTaken: 'None' | 'Logged' | 'Blocked' | 'Modified' | 'Alerted';
  analyzedAt: Date;
  analyzedBy?: string;
}

export interface ContentFilterResult {
  id: string;
  policyId: string;
  contentHash: string;
  filterType: 'Profanity' | 'Hate Speech' | 'Violence' | 'Adult Content' | 'Misinformation' | 'Spam' | 'Other';
  severityScore?: number;
  confidenceScore?: number;
  detectedPatterns?: string[];
  sentimentScore?: number;
  toxicityScore?: number;
  actionTaken: 'None' | 'Logged' | 'Blocked' | 'Modified' | 'Alerted';
  originalContentLength?: number;
  modifiedContentLength?: number;
  analyzedAt: Date;
  analyzedBy?: string;
}

export interface ComplianceViolation {
  id: string;
  policyId: string;
  violationType: string;
  regulation?: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  contentHash?: string;
  metadata?: Record<string, any>;
  status: 'Open' | 'Acknowledged' | 'Resolved' | 'Dismissed';
  resolutionNotes?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  detectedBy?: string;
  resolvedBy?: string;
}

export interface SafetyIntervention {
  id: string;
  interventionType: 'Content Block' | 'Content Modification' | 'User Warning' | 'Rate Limiting' | 'Account Suspension';
  triggerPolicyId?: string;
  contentHash?: string;
  userIdentifier?: string;
  interventionReason: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  automated: boolean;
  effectivenessScore?: number;
  userFeedback?: Record<string, any>;
  triggeredAt: Date;
  resolvedAt?: Date;
  triggeredBy?: string;
}

export interface GuardrailMetrics {
  id: string;
  policyId: string;
  metricDate: Date;
  totalAnalyses: number;
  violationsDetected: number;
  falsePositives: number;
  falseNegatives: number;
  avgProcessingTimeMs?: number;
  accuracyRate?: number;
  precisionRate?: number;
  recallRate?: number;
  f1Score?: number;
  createdAt: Date;
}

// Analysis request/response types
export interface BiasAnalysisRequest {
  content: string;
  contentType?: 'text' | 'image' | 'audio' | 'video';
  context?: Record<string, any>;
  protectedAttributes?: string[];
  analysisType?: 'demographic_parity' | 'equalized_odds' | 'both';
}

export interface BiasAnalysisResponse {
  contentHash: string;
  overallBiasScore: number;
  biasDetections: {
    biasType: string;
    score: number;
    confidence: number;
    detectedTerms: string[];
    explanation: string;
  }[];
  fairnessMetrics: {
    demographicParity?: number;
    equalizedOdds?: number;
  };
  recommendations: string[];
  actionRequired: boolean;
}

export interface ContentFilterRequest {
  content: string;
  contentType?: 'text' | 'image' | 'audio' | 'video';
  filterTypes?: string[];
  strictMode?: boolean;
}

export interface ContentFilterResponse {
  contentHash: string;
  isBlocked: boolean;
  overallSeverity: number;
  filterResults: {
    filterType: string;
    severity: number;
    confidence: number;
    detectedPatterns: string[];
    explanation: string;
  }[];
  sentimentAnalysis: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  toxicityAnalysis: {
    score: number;
    categories: string[];
  };
  modifiedContent?: string;
  recommendations: string[];
}

export interface ComplianceCheckRequest {
  content: string;
  dataType?: 'personal' | 'sensitive' | 'public';
  regulations?: string[];
  context?: Record<string, any>;
}

export interface ComplianceCheckResponse {
  contentHash: string;
  compliant: boolean;
  violations: {
    regulation: string;
    violationType: string;
    severity: string;
    description: string;
    remediation: string;
  }[];
  recommendations: string[];
  riskScore: number;
}

// Bias detection specific types
export interface DemographicParityMetric {
  protectedAttribute: string;
  privilegedGroup: string;
  unprivilegedGroup: string;
  parityScore: number; // 0 = perfect parity, 1 = maximum disparity
  threshold: number;
  passes: boolean;
}

export interface EqualizedOddsMetric {
  protectedAttribute: string;
  privilegedGroup: string;
  unprivilegedGroup: string;
  truePositiveRateDifference: number;
  falsePositiveRateDifference: number;
  threshold: number;
  passes: boolean;
}

// Content analysis types
export interface TextAnalysisResult {
  wordCount: number;
  sentenceCount: number;
  readabilityScore: number;
  sentiment: {
    score: number;
    comparative: number;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  };
  entities: {
    type: string;
    text: string;
    confidence: number;
  }[];
  topics: string[];
  language: string;
  confidence: number;
}

// Policy rule types
export interface BiasDetectionRules {
  bias_types: string[];
  threshold: number;
  protected_attributes: string[];
  fairness_metrics: string[];
  demographic_groups?: Record<string, string[]>;
  context_aware?: boolean;
}

export interface ContentFilterRules {
  filter_types: string[];
  severity_threshold: number;
  block_explicit?: boolean;
  replacement_strategy?: 'asterisk' | 'removal' | 'replacement';
  custom_patterns?: string[];
  whitelist?: string[];
  blacklist?: string[];
}

export interface ComplianceRules {
  regulation: string;
  checks: string[];
  severity: string;
  data_types?: string[];
  retention_period?: number;
  consent_required?: boolean;
}

// Constants
export const BIAS_TYPES = [
  'Gender',
  'Race', 
  'Age',
  'Religion',
  'Nationality',
  'Disability',
  'Sexual Orientation',
  'Other'
] as const;

export const FILTER_TYPES = [
  'Profanity',
  'Hate Speech',
  'Violence',
  'Adult Content',
  'Misinformation',
  'Spam',
  'Other'
] as const;

export const POLICY_TYPES = [
  'Bias Detection',
  'Content Filter',
  'Compliance Check',
  'Safety Monitor'
] as const;

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ACTIONS = ['Log', 'Block', 'Modify', 'Alert'] as const;

export type BiasType = typeof BIAS_TYPES[number];
export type FilterType = typeof FILTER_TYPES[number];
export type PolicyType = typeof POLICY_TYPES[number];
export type SeverityLevel = typeof SEVERITY_LEVELS[number];
export type ActionType = typeof ACTIONS[number];