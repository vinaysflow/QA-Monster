/**
 * Security Fixer
 * Generates fixes for security code patterns (SAST findings)
 */

import { SASTResult } from '../../security/sast/types.js';
import { QAInputPackage } from '../../core/types.js';
import { FixSuggestion } from '../types.js';
import { Logger } from '../../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SecurityFixer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Generate fix suggestions for SAST findings
   */
  async generateFixes(sastResult: SASTResult, qaPackage: QAInputPackage): Promise<FixSuggestion[]> {
    const fixes: FixSuggestion[] = [];

    for (const finding of sastResult.findings) {
      const fix = await this.generateFixForFinding(finding, qaPackage);
      if (fix) {
        fixes.push(fix);
      }
    }

    this.logger.info(`[SecurityFixer] Generated ${fixes.length} security fix suggestions`);
    return fixes;
  }

  /**
   * Generate fix for a specific finding
   */
  private async generateFixForFinding(
    finding: any,
    qaPackage: QAInputPackage
  ): Promise<FixSuggestion | null> {
    try {
      // Read the file to get context
      const filePath = finding.file;
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      const lineIndex = finding.line - 1;

      if (lineIndex < 0 || lineIndex >= lines.length) {
        return null;
      }

      const currentLine = lines[lineIndex];
      const suggestedCode = this.generateFixCode(finding, currentLine);

      if (!suggestedCode) {
        return null;
      }

      return {
        id: `security-fix-${finding.patternId}-${finding.line}`,
        issueId: finding.patternId,
        type: 'security-fix',
        severity: finding.severity,
        description: finding.message,
        currentCode: currentLine,
        suggestedCode,
        confidence: 0.7, // Security fixes need review
        file: filePath,
        line: finding.line,
        explanation: finding.recommendation,
      };
    } catch (error) {
      this.logger.warn(`[SecurityFixer] Failed to generate fix for ${finding.patternId}:`, error);
      return null;
    }
  }

  /**
   * Generate fix code based on pattern type
   */
  private generateFixCode(finding: any, currentLine: string): string | null {
    const patternId = finding.patternId;

    // SQL Injection fixes
    if (patternId.includes('sql-injection')) {
      // Suggest parameterized queries
      if (currentLine.includes('SELECT') || currentLine.includes('INSERT') || 
          currentLine.includes('UPDATE') || currentLine.includes('DELETE')) {
        return currentLine.replace(/\+.*['"]/g, '?') // Replace concatenation with placeholder
          .replace(/\$\{.*\}/g, '?'); // Replace template literals
      }
    }

    // XSS fixes
    if (patternId.includes('xss-innerhtml')) {
      return currentLine.replace(/\.innerHTML\s*=/g, '.textContent =');
    }

    if (patternId.includes('xss-eval')) {
      // Suggest JSON.parse or other safe alternatives
      return currentLine.replace(/\beval\s*\(/g, 'JSON.parse(');
    }

    // Crypto fixes
    if (patternId.includes('weak-crypto-md5')) {
      return currentLine.replace(/md5/gi, 'sha256')
        .replace(/createHash\s*\(\s*['"]md5['"]/gi, 'createHash("sha256")');
    }

    if (patternId.includes('weak-crypto-sha1')) {
      return currentLine.replace(/sha1/gi, 'sha256')
        .replace(/createHash\s*\(\s*['"]sha1['"]/gi, 'createHash("sha256")');
    }

    // Hardcoded credentials - suggest environment variable
    if (patternId.includes('hardcoded-credentials')) {
      const match = currentLine.match(/(password|api[_-]?key|secret|token)\s*[:=]\s*['"]([^'"]+)['"]/i);
      if (match) {
        const varName = match[1].toUpperCase().replace(/[_-]/g, '_');
        return currentLine.replace(/['"][^'"]+['"]/, `process.env.${varName}`);
      }
    }

    // Generic: return recommendation as comment
    return `// TODO: ${finding.recommendation}\n${currentLine}`;
  }
}
