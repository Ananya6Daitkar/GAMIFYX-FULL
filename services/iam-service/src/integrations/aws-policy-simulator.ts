/**
 * AWS IAM Policy Simulator Integration for GamifyX
 * Provides policy simulation, validation, and testing capabilities
 */

import { EventEmitter } from 'events';
import { 
  IAMClient, 
  SimulatePrincipalPolicyCommand,
  SimulateCustomPolicyCommand,
  GetAccountAuthorizationDetailsCommand,
  ListPoliciesCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand
} from '@aws-sdk/client-iam';
import { Logger } from '../utils/logger';
import { 
  PolicySimulationRequest,
  PolicySimulationResult,
  PolicyDocument,
  SimulationContext,
  PolicyValidationResult,
  AWSPolicyConfig
} from '../types/aws-policy-types';

export class AWSPolicySimulator extends EventEmitter {
  private logger: Logger;
  private config: AWSPolicyConfig;
  private iamClient: IAMClient;

  constructor(config: AWSPolicyConfig) {
    super();
    this.config = config;
    this.logger = new Logger('AWSPolicySimulator');
    
    this.iamClient = new IAMClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken
      }
    });
  }

  /**
   * Simulate IAM policy for specific actions and resources
   */
  async simulatePolicy(request: PolicySimulationRequest): Promise<PolicySimulationResult> {
    try {
      this.logger.info('Starting policy simulation', {
        principalArn: request.principalArn,
        actionNames: request.actionNames,
        resourceArns: request.resourceArns
      });

      const startTime = Date.now();

      let command;
      
      if (request.principalArn) {
        // Simulate using existing principal (user/role)
        command = new SimulatePrincipalPolicyCommand({
          PolicySourceArn: request.principalArn,
          ActionNames: request.actionNames,
          ResourceArns: request.resourceArns,
          ContextEntries: this.buildContextEntries(request.context),
          ResourcePolicy: request.resourcePolicy,
          ResourceOwner: request.resourceOwner,
          CallerArn: request.callerArn,
          MaxItems: request.maxItems || 1000
        });
      } else {
        // Simulate using custom policy documents
        command = new SimulateCustomPolicyCommand({
          PolicyInputList: request.policyDocuments?.map(doc => JSON.stringify(doc)) || [],
          ActionNames: request.actionNames,
          ResourceArns: request.resourceArns,
          ContextEntries: this.buildContextEntries(request.context),
          ResourcePolicy: request.resourcePolicy,
          ResourceOwner: request.resourceOwner,
          CallerArn: request.callerArn,
          MaxItems: request.maxItems || 1000
        });
      }

      const response = await this.iamClient.send(command);
      const duration = Date.now() - startTime;

      const result: PolicySimulationResult = {
        simulationId: this.generateSimulationId(),
        timestamp: new Date(),
        duration,
        evaluationResults: response.EvaluationResults?.map(evalResult => ({
          evalActionName: evalResult.EvalActionName!,
          evalResourceName: evalResult.EvalResourceName!,
          evalDecision: evalResult.EvalDecision!,
          matchedStatements: evalResult.MatchedStatements?.map(stmt => ({
            sourcePolicyId: stmt.SourcePolicyId,
            sourcePolicyType: stmt.SourcePolicyType,
            startPosition: stmt.StartPosition,
            endPosition: stmt.EndPosition
          })) || [],
          missingContextValues: evalResult.MissingContextValues || [],
          organizationsDecisionDetail: evalResult.OrganizationsDecisionDetail,
          permissionsBoundaryDecisionDetail: evalResult.PermissionsBoundaryDecisionDetail,
          evalDecisionDetails: evalResult.EvalDecisionDetails || {}
        })) || [],
        isTruncated: response.IsTruncated || false,
        marker: response.Marker
      };

      // Analyze results
      result.summary = this.analyzeSimulationResults(result);

      // Log simulation
      await this.logSimulation(request, result);

      this.emit('simulation:completed', { request, result });

      return result;

    } catch (error) {
      this.logger.error('Policy simulation error', error);
      throw error;
    }
  }

  /**
   * Validate policy document syntax and structure
   */
  async validatePolicy(policyDocument: PolicyDocument): Promise<PolicyValidationResult> {
    try {
      this.logger.info('Validating policy document');

      const validation: PolicyValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      // Basic structure validation
      if (!policyDocument.Version) {
        validation.warnings.push('Policy version not specified, defaulting to 2008-10-17');
      }

      if (!policyDocument.Statement || !Array.isArray(policyDocument.Statement)) {
        validation.isValid = false;
        validation.errors.push('Policy must contain a Statement array');
        return validation;
      }

      // Validate each statement
      for (let i = 0; i < policyDocument.Statement.length; i++) {
        const statement = policyDocument.Statement[i];
        const statementValidation = await this.validateStatement(statement, i);
        
        validation.errors.push(...statementValidation.errors);
        validation.warnings.push(...statementValidation.warnings);
        validation.suggestions.push(...statementValidation.suggestions);
      }

      validation.isValid = validation.errors.length === 0;

      // Test policy with simulation if valid
      if (validation.isValid && this.config.testPolicyOnValidation) {
        const testResult = await this.testPolicyWithCommonActions(policyDocument);
        validation.testResults = testResult;
      }

      return validation;

    } catch (error) {
      this.logger.error('Policy validation error', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Generate policy recommendations based on usage patterns
   */
  async generatePolicyRecommendations(
    principalArn: string, 
    analysisOptions?: {
      includeDenyRecommendations?: boolean;
      includeConditionRecommendations?: boolean;
      analyzePeriodDays?: number;
    }
  ): Promise<any> {
    try {
      this.logger.info('Generating policy recommendations', { principalArn });

      const recommendations = {
        principalArn,
        generatedAt: new Date(),
        recommendations: [],
        unusedPermissions: [],
        overprivilegedActions: [],
        suggestedConditions: [],
        securityFindings: []
      };

      // Get current policies for the principal
      const currentPolicies = await this.getPrincipalPolicies(principalArn);

      // Analyze CloudTrail logs for actual usage (if configured)
      if (this.config.cloudTrailAnalysis?.enabled) {
        const usageAnalysis = await this.analyzeCloudTrailUsage(
          principalArn, 
          analysisOptions?.analyzePeriodDays || 90
        );
        
        recommendations.unusedPermissions = await this.findUnusedPermissions(
          currentPolicies, 
          usageAnalysis
        );
        
        recommendations.overprivilegedActions = await this.findOverprivilegedActions(
          currentPolicies, 
          usageAnalysis
        );
      }

      // Generate condition recommendations
      if (analysisOptions?.includeConditionRecommendations) {
        recommendations.suggestedConditions = await this.generateConditionRecommendations(
          principalArn,
          currentPolicies
        );
      }

      // Security analysis
      recommendations.securityFindings = await this.performSecurityAnalysis(currentPolicies);

      // Generate optimized policy
      recommendations.optimizedPolicy = await this.generateOptimizedPolicy(
        currentPolicies,
        recommendations
      );

      this.emit('recommendations:generated', { principalArn, recommendations });

      return recommendations;

    } catch (error) {
      this.logger.error('Policy recommendations error', error);
      throw error;
    }
  }

  /**
   * Batch simulate multiple policies for testing
   */
  async batchSimulate(requests: PolicySimulationRequest[]): Promise<PolicySimulationResult[]> {
    try {
      this.logger.info('Starting batch policy simulation', { count: requests.length });

      const results: PolicySimulationResult[] = [];
      const batchSize = this.config.batchSize || 10;

      // Process in batches to avoid rate limiting
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        
        const batchPromises = batch.map(request => 
          this.simulatePolicy(request).catch(error => ({
            simulationId: this.generateSimulationId(),
            timestamp: new Date(),
            duration: 0,
            evaluationResults: [],
            isTruncated: false,
            error: error.message
          }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < requests.length) {
          await this.delay(this.config.batchDelayMs || 1000);
        }
      }

      this.emit('batch_simulation:completed', { requestCount: requests.length, results });

      return results;

    } catch (error) {
      this.logger.error('Batch simulation error', error);
      throw error;
    }
  }

  /**
   * Compare two policies and highlight differences
   */
  async comparePolicies(
    policy1: PolicyDocument, 
    policy2: PolicyDocument
  ): Promise<any> {
    try {
      this.logger.info('Comparing policies');

      const comparison = {
        timestamp: new Date(),
        policy1Hash: this.hashPolicy(policy1),
        policy2Hash: this.hashPolicy(policy2),
        differences: {
          statements: {
            added: [],
            removed: [],
            modified: []
          },
          permissions: {
            added: [],
            removed: []
          }
        },
        effectiveChanges: [],
        riskAssessment: {
          riskLevel: 'low',
          concerns: [],
          recommendations: []
        }
      };

      // Compare statements
      const statements1 = policy1.Statement || [];
      const statements2 = policy2.Statement || [];

      // Find added, removed, and modified statements
      comparison.differences.statements = this.compareStatements(statements1, statements2);

      // Analyze effective permission changes
      comparison.effectiveChanges = await this.analyzeEffectiveChanges(policy1, policy2);

      // Assess risk of changes
      comparison.riskAssessment = this.assessPolicyChangeRisk(comparison.differences);

      return comparison;

    } catch (error) {
      this.logger.error('Policy comparison error', error);
      throw error;
    }
  }

  // Private helper methods

  private buildContextEntries(context?: SimulationContext): any[] {
    if (!context) return [];

    return Object.entries(context).map(([key, value]) => ({
      ContextKeyName: key,
      ContextKeyValues: Array.isArray(value) ? value : [value],
      ContextKeyType: this.inferContextKeyType(value)
    }));
  }

  private inferContextKeyType(value: any): string {
    if (typeof value === 'string') {
      // Check if it's a date
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return 'date';
      }
      // Check if it's an IP address
      if (value.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
        return 'ip';
      }
      return 'string';
    }
    if (typeof value === 'number') return 'numeric';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }

  private analyzeSimulationResults(result: PolicySimulationResult): any {
    const summary = {
      totalEvaluations: result.evaluationResults.length,
      allowedActions: 0,
      deniedActions: 0,
      implicitDenyActions: 0,
      explicitDenyActions: 0,
      allowedResources: new Set<string>(),
      deniedResources: new Set<string>(),
      policyEffectiveness: 0
    };

    result.evaluationResults.forEach(evalResult => {
      switch (evalResult.evalDecision) {
        case 'allowed':
          summary.allowedActions++;
          summary.allowedResources.add(evalResult.evalResourceName);
          break;
        case 'explicitDeny':
          summary.deniedActions++;
          summary.explicitDenyActions++;
          summary.deniedResources.add(evalResult.evalResourceName);
          break;
        case 'implicitDeny':
          summary.deniedActions++;
          summary.implicitDenyActions++;
          summary.deniedResources.add(evalResult.evalResourceName);
          break;
      }
    });

    summary.policyEffectiveness = summary.totalEvaluations > 0 
      ? (summary.allowedActions / summary.totalEvaluations) * 100 
      : 0;

    return {
      ...summary,
      allowedResources: Array.from(summary.allowedResources),
      deniedResources: Array.from(summary.deniedResources)
    };
  }

  private async validateStatement(statement: any, index: number): Promise<PolicyValidationResult> {
    const validation: PolicyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    const prefix = `Statement[${index}]`;

    // Required fields
    if (!statement.Effect) {
      validation.errors.push(`${prefix}: Effect is required`);
    } else if (!['Allow', 'Deny'].includes(statement.Effect)) {
      validation.errors.push(`${prefix}: Effect must be 'Allow' or 'Deny'`);
    }

    if (!statement.Action && !statement.NotAction) {
      validation.errors.push(`${prefix}: Action or NotAction is required`);
    }

    // Resource validation
    if (!statement.Resource && !statement.NotResource && statement.Effect === 'Allow') {
      validation.warnings.push(`${prefix}: Resource not specified, applies to all resources`);
    }

    // Principal validation (for resource-based policies)
    if (statement.Principal === '*') {
      validation.warnings.push(`${prefix}: Principal is '*', allows access from any AWS account`);
    }

    // Condition validation
    if (statement.Condition) {
      const conditionValidation = this.validateConditions(statement.Condition, prefix);
      validation.errors.push(...conditionValidation.errors);
      validation.warnings.push(...conditionValidation.warnings);
      validation.suggestions.push(...conditionValidation.suggestions);
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  private validateConditions(conditions: any, prefix: string): PolicyValidationResult {
    const validation: PolicyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    const validOperators = [
      'StringEquals', 'StringNotEquals', 'StringLike', 'StringNotLike',
      'NumericEquals', 'NumericNotEquals', 'NumericLessThan', 'NumericLessThanEquals',
      'NumericGreaterThan', 'NumericGreaterThanEquals',
      'DateEquals', 'DateNotEquals', 'DateLessThan', 'DateLessThanEquals',
      'DateGreaterThan', 'DateGreaterThanEquals',
      'Bool', 'BinaryEquals', 'IpAddress', 'NotIpAddress',
      'ArnEquals', 'ArnLike', 'ArnNotEquals', 'ArnNotLike'
    ];

    Object.keys(conditions).forEach(operator => {
      if (!validOperators.includes(operator)) {
        validation.warnings.push(`${prefix}.Condition: Unknown operator '${operator}'`);
      }

      const conditionBlock = conditions[operator];
      Object.keys(conditionBlock).forEach(key => {
        // Validate condition keys
        if (key.startsWith('aws:') && !this.isValidAWSConditionKey(key)) {
          validation.warnings.push(`${prefix}.Condition: Unknown AWS condition key '${key}'`);
        }
      });
    });

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  private isValidAWSConditionKey(key: string): boolean {
    const commonKeys = [
      'aws:CurrentTime', 'aws:EpochTime', 'aws:MultiFactorAuthAge',
      'aws:MultiFactorAuthPresent', 'aws:PrincipalArn', 'aws:PrincipalOrgID',
      'aws:PrincipalTag', 'aws:RequestedRegion', 'aws:SecureTransport',
      'aws:SourceIp', 'aws:SourceVpc', 'aws:SourceVpce', 'aws:UserAgent',
      'aws:userid', 'aws:username'
    ];
    return commonKeys.includes(key);
  }

  private async testPolicyWithCommonActions(policy: PolicyDocument): Promise<any> {
    const commonActions = [
      's3:GetObject',
      's3:PutObject',
      'ec2:DescribeInstances',
      'iam:GetUser',
      'logs:CreateLogGroup'
    ];

    const testRequest: PolicySimulationRequest = {
      policyDocuments: [policy],
      actionNames: commonActions,
      resourceArns: ['*']
    };

    return await this.simulatePolicy(testRequest);
  }

  private async getPrincipalPolicies(principalArn: string): Promise<PolicyDocument[]> {
    // This would fetch all policies attached to the principal
    // Implementation depends on whether it's a user, role, or group
    return [];
  }

  private async analyzeCloudTrailUsage(principalArn: string, days: number): Promise<any> {
    // This would analyze CloudTrail logs to determine actual API usage
    // Implementation would require CloudTrail integration
    return {};
  }

  private async findUnusedPermissions(policies: PolicyDocument[], usage: any): Promise<string[]> {
    // Compare policy permissions with actual usage to find unused permissions
    return [];
  }

  private async findOverprivilegedActions(policies: PolicyDocument[], usage: any): Promise<string[]> {
    // Find actions that are allowed but never used
    return [];
  }

  private async generateConditionRecommendations(principalArn: string, policies: PolicyDocument[]): Promise<any[]> {
    // Generate recommendations for adding conditions to improve security
    return [];
  }

  private async performSecurityAnalysis(policies: PolicyDocument[]): Promise<any[]> {
    const findings = [];

    policies.forEach((policy, policyIndex) => {
      policy.Statement?.forEach((statement, statementIndex) => {
        // Check for overly permissive statements
        if (statement.Resource === '*' && statement.Action === '*') {
          findings.push({
            type: 'HIGH_RISK',
            severity: 'HIGH',
            message: `Policy ${policyIndex}, Statement ${statementIndex}: Grants all actions on all resources`,
            recommendation: 'Restrict to specific actions and resources'
          });
        }

        // Check for missing conditions on sensitive actions
        if (this.isSensitiveAction(statement.Action) && !statement.Condition) {
          findings.push({
            type: 'MISSING_CONDITIONS',
            severity: 'MEDIUM',
            message: `Policy ${policyIndex}, Statement ${statementIndex}: Sensitive action without conditions`,
            recommendation: 'Add conditions like IP restrictions or MFA requirements'
          });
        }
      });
    });

    return findings;
  }

  private isSensitiveAction(action: any): boolean {
    const sensitiveActions = [
      'iam:*',
      '*:Delete*',
      '*:Terminate*',
      'sts:AssumeRole'
    ];

    if (typeof action === 'string') {
      return sensitiveActions.some(sensitive => 
        action.includes(sensitive.replace('*', '')) || 
        sensitive.includes(action)
      );
    }

    if (Array.isArray(action)) {
      return action.some(a => this.isSensitiveAction(a));
    }

    return false;
  }

  private async generateOptimizedPolicy(policies: PolicyDocument[], recommendations: any): Promise<PolicyDocument> {
    // Generate an optimized policy based on recommendations
    return {
      Version: '2012-10-17',
      Statement: []
    };
  }

  private compareStatements(statements1: any[], statements2: any[]): any {
    // Compare two sets of policy statements
    return {
      added: [],
      removed: [],
      modified: []
    };
  }

  private async analyzeEffectiveChanges(policy1: PolicyDocument, policy2: PolicyDocument): Promise<any[]> {
    // Analyze the effective permission changes between two policies
    return [];
  }

  private assessPolicyChangeRisk(differences: any): any {
    let riskLevel = 'low';
    const concerns = [];
    const recommendations = [];

    // Assess risk based on changes
    if (differences.statements.added.length > 0) {
      concerns.push('New statements added');
      riskLevel = 'medium';
    }

    if (differences.permissions.added.length > 0) {
      concerns.push('New permissions granted');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return { riskLevel, concerns, recommendations };
  }

  private hashPolicy(policy: PolicyDocument): string {
    return Buffer.from(JSON.stringify(policy)).toString('base64');
  }

  private async logSimulation(request: PolicySimulationRequest, result: PolicySimulationResult): Promise<void> {
    // Log simulation for audit purposes
    this.logger.info('Policy simulation completed', {
      simulationId: result.simulationId,
      duration: result.duration,
      evaluationCount: result.evaluationResults.length,
      allowedActions: result.summary?.allowedActions,
      deniedActions: result.summary?.deniedActions
    });
  }

  private generateSimulationId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}