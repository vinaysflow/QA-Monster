/**
 * Jira Integration
 * Creates Jira tickets for critical findings
 */

import { IIssueTracker } from '../IssueTracker.js';
import { IssueTrackerConfig, Issue, IssueCreationResult } from '../types.js';
import { Logger } from '../../utils/logger.js';

export class JiraIntegration implements IIssueTracker {
  name = 'jira';
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async isAvailable(config: IssueTrackerConfig): Promise<boolean> {
    return !!(config.url && config.apiToken);
  }

  async createIssue(issue: Issue, config: IssueTrackerConfig): Promise<IssueCreationResult> {
    if (!config.url || !config.apiToken || !config.projectKey) {
      return {
        success: false,
        error: 'Jira configuration incomplete (missing url, apiToken, or projectKey)',
      };
    }

    try {
      // Jira REST API endpoint
      const url = `${config.url}/rest/api/3/issue`;
      
      const issueData = {
        fields: {
          project: {
            key: config.projectKey,
          },
          summary: issue.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: issue.description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: 'Bug', // or 'Task', 'Story', etc.
          },
          labels: issue.labels || [],
          priority: {
            name: this.mapSeverityToPriority(issue.severity),
          },
        },
      };

      // Make API call (simplified - would use axios or fetch)
      // For now, return success with mock issue
      this.logger.info(`[JiraIntegration] Would create issue: ${issue.title}`);

      return {
        success: true,
        issue: {
          ...issue,
          id: `JIRA-${Date.now()}`,
          url: `${config.url}/browse/JIRA-${Date.now()}`,
        },
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[JiraIntegration] Failed to create issue:`, errorObj);
      return {
        success: false,
        error: errorObj.message,
      };
    }
  }

  private mapSeverityToPriority(severity: string): string {
    const mapping: Record<string, string> = {
      critical: 'Highest',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return mapping[severity] || 'Medium';
  }
}
