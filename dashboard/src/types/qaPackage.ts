/**
 * QA Package types for dashboard
 */

export interface SecurityVulnerability {
  id: string;
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve?: string;
  description: string;
  fixVersion?: string;
}

export interface SecurityFinding {
  patternId: string;
  patternName: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
}

export interface QAInputPackage {
  understanding: {
    target: {
      file: string;
      purpose: string;
      complexity: {
        cyclomatic: number;
        cognitive: number;
        linesOfCode: number;
      };
    };
    confidence: number;
  };
  security?: {
    sca?: {
      vulnerabilities: SecurityVulnerability[];
      summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    };
    sast?: {
      findings: SecurityFinding[];
      summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    };
  };
  qualityGate?: {
    passed: boolean;
    summary: {
      total: number;
      passed: number;
      failed: number;
    };
  };
  fixes?: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
  }>;
  coverage?: {
    report?: {
      total: {
        lines: { percentage: number };
        statements: { percentage: number };
      };
    };
    gaps?: Array<{
      file: string;
      priority: string;
      recommendation: string;
    }>;
  };
}
