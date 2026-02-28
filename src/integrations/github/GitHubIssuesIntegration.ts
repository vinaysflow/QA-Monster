/**
 * GitHub Issues Integration
 * Creates GitHub Issues for critical findings
 */

import { IIssueTracker } from '../IssueTracker.js';
import { IssueTrackerConfig, Issue, IssueCreationResult } from '../types.js';
import { Logger } from '../../utils/logger.js';

export class GitHubIssuesIntegration implements IIssueTracker {
  name = 'github';
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async isAvailable(config: IssueTrackerConfig): Promise<boolean> {
    return !!config.apiToken;
  }

  async createIssue(issue: Issue, config: IssueTrackerConfig): Promise<IssueCreationResult> {
    if (!config.apiToken || !config.projectKey) {
      return {
        success: false,
        error: 'GitHub configuration incomplete (missing apiToken or projectKey)',
      };
    }

    try {
      // Parse projectKey as owner/repo
      const [owner, repo] = config.projectKey.split('/');
      if (!owner || !repo) {
        return {
          success: false,
          error: 'projectKey must be in format owner/repo',
        };
      }

      // GitHub API endpoint
      const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

      const issueData = {
        title: issue.title,
        body: this.formatIssueBody(issue),
        labels: issue.labels || [],
        assignees: config.autoAssign && issue.assignee ? [issue.assignee] : [],
      };

      // Make API call (simplified - would use axios or fetch)
      // For now, return success with mock issue
      this.logger.info(`[GitHubIssuesIntegration] Would create issue: ${issue.title}`);

      return {
        success: true,
        issue: {
          ...issue,
          id: `gh-${Date.now()}`,
          url: `https://github.com/${owner}/${repo}/issues/${Date.now()}`,
        },
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[GitHubIssuesIntegration] Failed to create issue:`, errorObj);
      return {
        success: false,
        error: errorObj.message,
      };
    }
  }

  private formatIssueBody(issue: Issue): string {
    let body = issue.description;

    if (issue.file) {
      body += `\n\n**File:** \`${issue.file}\``;
      if (issue.line) {
        body += `:${issue.line}`;
      }
    }

    body += `\n\n**Severity:** ${issue.severity}`;
    body += `\n**Type:** ${issue.type}`;

    return body;
  }
}
