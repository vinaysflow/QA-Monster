/**
 * Security vulnerability types and interfaces
 */

export interface SecurityVulnerability {
  id: string;
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve?: string;
  description: string;
  fixVersion?: string;
  scanner: 'snyk' | 'npm-audit' | 'owasp';
  filePath?: string;
  lineNumber?: number;
  url?: string;
  publishedDate?: string;
  affectedVersions?: string[];
}

export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  scanner: string;
  scannedAt: string;
  sbom?: any; // For future SBOM integration
  packagesScanned: number;
  packagesWithVulnerabilities: number;
}

export interface ScannerConfig {
  enabled: boolean;
  apiKey?: string;
  timeout?: number;
  failOnCritical?: boolean;
  excludePatterns?: string[];
}
