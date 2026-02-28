/**
 * Issue Tracker Integration types
 */

export interface IssueTrackerConfig {
  provider: 'jira' | 'github' | 'azure-devops';
  enabled: boolean;
  projectKey?: string;
  createForSeverity: ('critical' | 'high' | 'medium')[];
  autoAssign?: boolean;
  labels?: string[];
  url?: string;
  apiToken?: string;
}

export interface Issue {
  id?: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'security' | 'quality' | 'coverage' | 'other';
  file?: string;
  line?: number;
  labels?: string[];
  assignee?: string;
  url?: string;
}

export interface IssueCreationResult {
  success: boolean;
  issue?: Issue;
  error?: string;
}
