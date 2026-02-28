/**
 * Predefined Quality Gate Rules
 */

import { QualityGateRule } from './QualityGate.js';

/**
 * Get predefined security rules
 */
export function getSecurityRules(): QualityGateRule[] {
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
      id: 'no-high-security',
      name: 'No High Security Vulnerabilities',
      metric: 'security',
      threshold: 0,
      operator: 'eq',
      severity: 'warning',
      message: 'High security vulnerabilities should be reviewed',
    },
  ];
}

/**
 * Get predefined complexity rules
 */
export function getComplexityRules(): QualityGateRule[] {
  return [
    {
      id: 'max-complexity-50',
      name: 'Maximum Cyclomatic Complexity (50)',
      metric: 'complexity',
      threshold: 50,
      operator: 'lte',
      severity: 'warning',
      message: 'Cyclomatic complexity should not exceed 50',
    },
    {
      id: 'max-complexity-100',
      name: 'Maximum Cyclomatic Complexity (100)',
      metric: 'complexity',
      threshold: 100,
      operator: 'lte',
      severity: 'error',
      message: 'Cyclomatic complexity must not exceed 100',
    },
  ];
}

/**
 * Get predefined SAST rules
 */
export function getSASTRules(): QualityGateRule[] {
  return [
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
 * Get all predefined rules
 */
export function getAllPredefinedRules(): QualityGateRule[] {
  return [
    ...getSecurityRules(),
    ...getComplexityRules(),
    ...getSASTRules(),
  ];
}
