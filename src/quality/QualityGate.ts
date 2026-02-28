/**
 * Quality Gate Engine
 * Configurable thresholds that can block merges or fail builds
 */

import { QAInputPackage } from '../core/types.js';
import { Logger } from '../utils/logger.js';

export interface QualityGateRule {
  id: string;
  name: string;
  metric: 'security' | 'complexity' | 'coverage' | 'testability' | 'sast';
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'error' | 'warning';
  message: string;
}

export interface QualityGateResult {
  passed: boolean;
  rules: Array<{
    rule: QualityGateRule;
    passed: boolean;
    actualValue: number;
    message: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export class QualityGate {
  private rules: QualityGateRule[] = [];
  private logger: Logger;

  constructor(rules?: QualityGateRule[]) {
    this.logger = new Logger();
    this.rules = rules || this.getDefaultRules();
  }

  /**
   * Get default quality gate rules
   */
  private getDefaultRules(): QualityGateRule[] {
    return [
      {
        id: 'no-critical-security',
        name: 'No Critical Security Vulnerabilities',
        metric: 'security',
        threshold: 0,
        operator: 'eq',
        severity: 'error',
        message: 'Critical security vulnerabilities must be resolved before merge',
      },
      {
        id: 'max-complexity',
        name: 'Maximum Cyclomatic Complexity',
        metric: 'complexity',
        threshold: 50,
        operator: 'lte',
        severity: 'warning',
        message: 'Cyclomatic complexity should not exceed 50',
      },
      {
        id: 'no-critical-sast',
        name: 'No Critical SAST Findings',
        metric: 'sast',
        threshold: 0,
        operator: 'eq',
        severity: 'error',
        message: 'Critical SAST findings must be resolved before merge',
      },
    ];
  }

  /**
   * Evaluate quality gates against analysis results
   */
  evaluate(qaPackage: QAInputPackage): QualityGateResult {
    this.logger.info('[QualityGate] Evaluating quality gates');

    const ruleResults: QualityGateResult['rules'] = [];

    for (const rule of this.rules) {
      const actualValue = this.getMetricValue(qaPackage, rule.metric);
      const passed = this.evaluateRule(rule, actualValue);

      ruleResults.push({
        rule,
        passed,
        actualValue,
        message: passed
          ? `✅ ${rule.name}: Passed (${actualValue})`
          : `${passed ? '⚠️' : '❌'} ${rule.name}: Failed (${actualValue} ${this.getOperatorSymbol(rule.operator)} ${rule.threshold})`,
      });

      if (!passed) {
        this.logger.warn(`[QualityGate] Rule failed: ${rule.name} - ${rule.message}`);
      }
    }

    const summary = {
      total: ruleResults.length,
      passed: ruleResults.filter(r => r.passed).length,
      failed: ruleResults.filter(r => !r.passed && r.rule.severity === 'error').length,
      warnings: ruleResults.filter(r => !r.passed && r.rule.severity === 'warning').length,
    };

    const passed = summary.failed === 0;

    return {
      passed,
      rules: ruleResults,
      summary,
    };
  }

  /**
   * Get metric value from QA package
   */
  private getMetricValue(qaPackage: QAInputPackage, metric: QualityGateRule['metric']): number {
    switch (metric) {
      case 'security':
        const scaCritical = qaPackage.security?.sca?.summary.critical || 0;
        const sastCritical = qaPackage.security?.sast?.summary.critical || 0;
        return scaCritical + sastCritical;

      case 'sast':
        return qaPackage.security?.sast?.summary.critical || 0;

      case 'complexity':
        return qaPackage.understanding.target.complexity.cyclomatic;

      case 'coverage':
        // Will be implemented when coverage tracking is added
        return 0;

      case 'testability':
        const testabilityMap = { high: 3, medium: 2, low: 1 };
        return testabilityMap[qaPackage.insights.testability] || 0;

      default:
        return 0;
    }
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: QualityGateRule, actualValue: number): boolean {
    switch (rule.operator) {
      case 'gt':
        return actualValue > rule.threshold;
      case 'lt':
        return actualValue < rule.threshold;
      case 'eq':
        return actualValue === rule.threshold;
      case 'gte':
        return actualValue >= rule.threshold;
      case 'lte':
        return actualValue <= rule.threshold;
      default:
        return true;
    }
  }

  /**
   * Get operator symbol for display
   */
  private getOperatorSymbol(operator: QualityGateRule['operator']): string {
    const symbols = {
      gt: '>',
      lt: '<',
      eq: '==',
      gte: '>=',
      lte: '<=',
    };
    return symbols[operator];
  }

  /**
   * Add custom rule
   */
  addRule(rule: QualityGateRule): void {
    this.rules.push(rule);
    this.logger.info(`[QualityGate] Added rule: ${rule.name}`);
  }

  /**
   * Remove rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.logger.info(`[QualityGate] Removed rule: ${ruleId}`);
  }

  /**
   * Get all rules
   */
  getRules(): QualityGateRule[] {
    return [...this.rules];
  }
}
