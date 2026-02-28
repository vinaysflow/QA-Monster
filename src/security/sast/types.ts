/**
 * SAST (Static Application Security Testing) types
 */

import { ParsedFile } from '../../plugins/interfaces.js';

export interface SecurityPattern {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  category: 'injection' | 'xss' | 'crypto' | 'auth' | 'secrets' | 'other';
  detector: (file: ParsedFile) => SecurityFinding[];
}

export interface SecurityFinding {
  patternId: string;
  patternName: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  codeSnippet: string;
  category: string;
  cwe?: string;
  owasp?: string;
}

export interface SASTResult {
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  scannedAt: string;
  filesScanned: number;
}
