/**
 * Auto-Fix types and interfaces
 */

export interface FixSuggestion {
  id: string;
  issueId: string;
  type: 'dependency-update' | 'code-change' | 'refactor' | 'security-fix';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  currentCode?: string;
  suggestedCode: string;
  confidence: number;
  patch?: string; // Unified diff format
  file: string;
  line: number;
  endLine?: number;
  explanation: string;
}

export interface FixResult {
  applied: boolean;
  fixId: string;
  file: string;
  originalContent: string;
  newContent: string;
  patch: string;
  error?: string;
}
