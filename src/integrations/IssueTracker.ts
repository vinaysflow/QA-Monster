/**
 * Issue Tracker Base Interface
 * Plugin architecture for issue tracker integrations
 */

import { IssueTrackerConfig, Issue, IssueCreationResult } from './types.js';
import { QAInputPackage } from '../core/types.js';
import { Logger } from '../utils/logger.js';

export interface IIssueTracker {
  name: string;
  createIssue(issue: Issue, config: IssueTrackerConfig): Promise<IssueCreationResult>;
  isAvailable(config: IssueTrackerConfig): Promise<boolean>;
}

/**
 * Issue Tracker Orchestrator
 */
export class IssueTracker {
  private trackers: Map<string, IIssueTracker> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Register issue tracker
   */
  registerTracker(tracker: IIssueTracker): void {
    this.trackers.set(tracker.name, tracker);
    this.logger.info(`[IssueTracker] Registered tracker: ${tracker.name}`);
  }

  /**
   * Create issues from QA package findings
   */
  async createIssues(
    qaPackage: QAInputPackage,
    config: IssueTrackerConfig
  ): Promise<IssueCreationResult[]> {
    if (!config.enabled) {
      this.logger.info('[IssueTracker] Issue creation disabled');
      return [];
    }

    const tracker = this.trackers.get(config.provider);
    if (!tracker) {
      this.logger.warn(`[IssueTracker] No tracker found for provider: ${config.provider}`);
      return [];
    }

    const isAvailable = await tracker.isAvailable(config);
    if (!isAvailable) {
      this.logger.warn(`[IssueTracker] Tracker ${config.provider} is not available`);
      return [];
    }

    const issues: Issue[] = [];
    const results: IssueCreationResult[] = [];

    // Collect security issues
    if (qaPackage.security?.sca && config.createForSeverity.includes('critical')) {
      for (const vuln of qaPackage.security.sca.vulnerabilities) {
        if (vuln.severity === 'critical' || vuln.severity === 'high') {
          issues.push({
            title: `Security Vulnerability: ${vuln.package}@${vuln.version}`,
            description: `**CVE:** ${vuln.cve || 'N/A'}\n\n**Description:** ${vuln.description}\n\n**Fix:** Update to ${vuln.fixVersion || 'latest version'}`,
            severity: vuln.severity,
            type: 'security',
            file: vuln.filePath,
            line: vuln.lineNumber,
            labels: ['security', 'dependency', vuln.severity],
          });
        }
      }
    }

    if (qaPackage.security?.sast && config.createForSeverity.includes('critical')) {
      for (const finding of qaPackage.security.sast.findings) {
        if (finding.severity === 'critical' || finding.severity === 'high') {
          issues.push({
            title: `SAST Finding: ${finding.patternName}`,
            description: `**File:** ${finding.file}:${finding.line}\n\n**Message:** ${finding.message}\n\n**Recommendation:** ${finding.recommendation}\n\n**CWE:** ${finding.cwe || 'N/A'}`,
            severity: finding.severity,
            type: 'security',
            file: finding.file,
            line: finding.line,
            labels: ['security', 'sast', finding.severity],
          });
        }
      }
    }

    // Create issues
    for (const issue of issues) {
      try {
        const result = await tracker.createIssue(issue, config);
        results.push(result);
        if (result.success && result.issue) {
          this.logger.info(`[IssueTracker] Created issue: ${result.issue.id || result.issue.title}`);
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`[IssueTracker] Failed to create issue:`, errorObj);
        results.push({
          success: false,
          error: errorObj.message,
        });
      }
    }

    return results;
  }
}
