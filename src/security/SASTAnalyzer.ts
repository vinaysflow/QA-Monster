/**
 * SAST Analyzer - Static Application Security Testing
 * Detects code-level security vulnerabilities
 */

import { ParsedFile } from '../plugins/interfaces.js';
import { SecurityPattern, SecurityFinding, SASTResult } from './sast/types.js';
import { Logger } from '../utils/logger.js';
import * as patterns from './sast/patterns.js';

export class SASTAnalyzer {
  private patterns: SecurityPattern[] = [];
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.registerPatterns();
  }

  /**
   * Register security patterns
   */
  private registerPatterns(): void {
    // Import and register all pattern detectors
    this.patterns = [
      ...patterns.getSQLInjectionPatterns(),
      ...patterns.getXSSPatterns(),
      ...patterns.getCryptoPatterns(),
      ...patterns.getAuthPatterns(),
      ...patterns.getSecretsPatterns(),
    ];
    this.logger.info(`[SASTAnalyzer] Registered ${this.patterns.length} security patterns`);
  }

  /**
   * Analyze file for security vulnerabilities
   */
  analyze(file: ParsedFile): SASTResult {
    this.logger.info(`[SASTAnalyzer] Analyzing ${file.path} for security vulnerabilities`);

    const findings: SecurityFinding[] = [];

    // Run all pattern detectors
    for (const pattern of this.patterns) {
      try {
        const patternFindings = pattern.detector(file);
        findings.push(...patternFindings);
      } catch (error) {
        this.logger.warn(`[SASTAnalyzer] Pattern ${pattern.id} failed:`, error);
      }
    }

    // Deduplicate findings
    const unique = this.deduplicateFindings(findings);

    return {
      findings: unique.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary: {
        critical: unique.filter(f => f.severity === 'critical').length,
        high: unique.filter(f => f.severity === 'high').length,
        medium: unique.filter(f => f.severity === 'medium').length,
        low: unique.filter(f => f.severity === 'low').length,
      },
      scannedAt: new Date().toISOString(),
      filesScanned: 1,
    };
  }

  /**
   * Deduplicate findings by location and pattern
   */
  private deduplicateFindings(findings: SecurityFinding[]): SecurityFinding[] {
    const seen = new Set<string>();
    return findings.filter(finding => {
      const key = `${finding.file}:${finding.line}:${finding.patternId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Register custom pattern
   */
  registerPattern(pattern: SecurityPattern): void {
    this.patterns.push(pattern);
    this.logger.info(`[SASTAnalyzer] Registered custom pattern: ${pattern.id}`);
  }
}
