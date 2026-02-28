/**
 * NPM Audit Scanner - Uses npm audit for vulnerability detection
 */

import { ISecurityScanner } from '../SecurityScanner.js';
import { SecurityScanResult, SecurityVulnerability, ScannerConfig } from '../types.js';
import { Logger } from '../../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class NpmAuditScanner implements ISecurityScanner {
  name = 'npm-audit';
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async isAvailable(): Promise<boolean> {
    // Check if npm is available
    try {
      await execAsync('npm --version');
      return true;
    } catch {
      return false;
    }
  }

  getSupportedManifests(): string[] {
    return ['package.json', 'package-lock.json'];
  }

  async scan(projectRoot: string, config?: ScannerConfig): Promise<SecurityScanResult> {
    this.logger.info(`[NpmAuditScanner] Scanning ${projectRoot}`);

    if (config?.enabled === false) {
      return this.getEmptyResult();
    }

    // Check if package.json exists
    const packageJsonPath = path.join(projectRoot, 'package.json');
    try {
      await fs.access(packageJsonPath);
    } catch {
      this.logger.warn('[NpmAuditScanner] No package.json found');
      return this.getEmptyResult();
    }

    try {
      // Run npm audit --json
      const { stdout, stderr } = await execAsync('npm audit --json', {
        cwd: projectRoot,
        timeout: config?.timeout || 60000,
      });

      if (stderr && !stdout) {
        this.logger.warn(`[NpmAuditScanner] Audit error: ${stderr}`);
        return this.getEmptyResult();
      }

      const auditResult = JSON.parse(stdout);
      return this.parseNpmAuditOutput(auditResult);
    } catch (error: any) {
      // npm audit returns non-zero exit code if vulnerabilities found
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          return this.parseNpmAuditOutput(auditResult);
        } catch {
          // Not JSON, might be error message
        }
      }
      
      // Check if it's just "no vulnerabilities" case
      if (error.code === 1 && error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          return this.parseNpmAuditOutput(auditResult);
        } catch {
          // Parse error, return empty
        }
      }

      this.logger.error(`[NpmAuditScanner] Scan failed:`, error.message);
      return this.getEmptyResult();
    }
  }

  private parseNpmAuditOutput(auditResult: any): SecurityScanResult {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (auditResult.vulnerabilities) {
      for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities)) {
        const vuln = vulnData as any;
        
        // npm audit can have nested vulnerabilities
        const processVuln = (v: any, pkg: string) => {
          vulnerabilities.push({
            id: v.id || v.cves?.[0] || `${pkg}-${v.title}`,
            package: pkg,
            version: v.range || 'unknown',
            severity: this.mapSeverity(v.severity),
            cve: v.cves?.[0],
            description: v.title || v.description || '',
            fixVersion: v.fixAvailable === true ? v.fixAvailable : undefined,
            scanner: 'npm-audit',
            url: v.url,
            affectedVersions: v.range ? [v.range] : undefined,
          });
        };

        processVuln(vuln, packageName);

        // Handle via paths (transitive dependencies)
        if (vuln.via && Array.isArray(vuln.via)) {
          for (const via of vuln.via) {
            if (typeof via === 'object' && via !== null) {
              processVuln(via, via.name || packageName);
            }
          }
        }
      }
    }

    // Deduplicate by CVE or package+id
    const seen = new Set<string>();
    const unique = vulnerabilities.filter(v => {
      const key = v.cve || `${v.package}-${v.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      vulnerabilities: unique,
      summary: {
        critical: unique.filter(v => v.severity === 'critical').length,
        high: unique.filter(v => v.severity === 'high').length,
        medium: unique.filter(v => v.severity === 'medium').length,
        low: unique.filter(v => v.severity === 'low').length,
      },
      scanner: 'npm-audit',
      scannedAt: new Date().toISOString(),
      packagesScanned: auditResult.metadata?.totalDependencies || 0,
      packagesWithVulnerabilities: Object.keys(auditResult.vulnerabilities || {}).length,
    };
  }

  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = severity?.toLowerCase() || '';
    if (lower === 'critical') return 'critical';
    if (lower === 'high') return 'high';
    if (lower === 'moderate' || lower === 'medium') return 'medium';
    return 'low';
  }

  private getEmptyResult(): SecurityScanResult {
    return {
      vulnerabilities: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      scanner: 'npm-audit',
      scannedAt: new Date().toISOString(),
      packagesScanned: 0,
      packagesWithVulnerabilities: 0,
    };
  }
}
