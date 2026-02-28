/**
 * Security Scanner - Base scanner interface and orchestrator
 * Supports multiple security scanning providers with unified interface
 */

import { SecurityScanResult, SecurityVulnerability, ScannerConfig } from './types.js';
import { Logger } from '../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Base interface for all security scanners
 */
export interface ISecurityScanner {
  name: string;
  scan(projectRoot: string, config?: ScannerConfig): Promise<SecurityScanResult>;
  isAvailable(): Promise<boolean>;
  getSupportedManifests(): string[];
}

// ISecurityScanner is already exported above

/**
 * Security Scanner orchestrator
 * Manages multiple scanners and aggregates results
 */
export class SecurityScanner {
  private scanners: ISecurityScanner[] = [];
  private logger: Logger;
  private cache: Map<string, SecurityScanResult> = new Map();

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Register a security scanner
   */
  registerScanner(scanner: ISecurityScanner): void {
    this.scanners.push(scanner);
    this.logger.info(`[SecurityScanner] Registered scanner: ${scanner.name}`);
  }

  /**
   * Scan project for security vulnerabilities
   */
  async scan(
    projectRoot: string,
    config?: {
      enabledScanners?: string[];
      failOnCritical?: boolean;
      cacheResults?: boolean;
    }
  ): Promise<SecurityScanResult> {
    const cacheKey = `${projectRoot}-${JSON.stringify(config)}`;
    
    // Check cache
    if (config?.cacheResults !== false && this.cache.has(cacheKey)) {
      this.logger.info('[SecurityScanner] Using cached scan results');
      return this.cache.get(cacheKey)!;
    }

    this.logger.info(`[SecurityScanner] Starting security scan in ${projectRoot}`);

    // Filter scanners if specific ones are requested
    const scannersToUse = config?.enabledScanners
      ? this.scanners.filter(s => config.enabledScanners!.includes(s.name))
      : this.scanners;

    // Check availability and run scans in parallel
    const availableScanners = await Promise.all(
      scannersToUse.map(async (scanner) => {
        const available = await scanner.isAvailable();
        return available ? scanner : null;
      })
    );

    const activeScanners = availableScanners.filter((s): s is ISecurityScanner => s !== null);

    if (activeScanners.length === 0) {
      this.logger.warn('[SecurityScanner] No available scanners found');
      return this.getEmptyResult();
    }

    this.logger.info(`[SecurityScanner] Running ${activeScanners.length} scanner(s)`);

    // Run all scanners in parallel
    const results = await Promise.allSettled(
      activeScanners.map(scanner => 
        scanner.scan(projectRoot).catch(error => {
          this.logger.error(`[SecurityScanner] Scanner ${scanner.name} failed:`, error);
          return this.getEmptyResult(scanner.name);
        })
      )
    );

    // Aggregate results
    const aggregated = this.aggregateResults(
      results
        .filter((r): r is PromiseFulfilledResult<SecurityScanResult> => r.status === 'fulfilled')
        .map(r => r.value)
    );

    // Cache result
    if (config?.cacheResults !== false) {
      this.cache.set(cacheKey, aggregated);
    }

    this.logger.info(
      `[SecurityScanner] Scan complete: ${aggregated.summary.critical} critical, ` +
      `${aggregated.summary.high} high, ${aggregated.summary.medium} medium, ` +
      `${aggregated.summary.low} low vulnerabilities`
    );

    return aggregated;
  }

  /**
   * Aggregate results from multiple scanners
   */
  private aggregateResults(results: SecurityScanResult[]): SecurityScanResult {
    const allVulnerabilities: SecurityVulnerability[] = [];
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    let totalPackagesScanned = 0;
    let totalPackagesWithVulns = 0;

    // Deduplicate vulnerabilities by CVE or package+version
    const seen = new Set<string>();

    for (const result of results) {
      for (const vuln of result.vulnerabilities) {
        const key = vuln.cve || `${vuln.package}@${vuln.version}-${vuln.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allVulnerabilities.push(vuln);
          summary[vuln.severity]++;
        }
      }
      totalPackagesScanned += result.packagesScanned;
      totalPackagesWithVulns += result.packagesWithVulnerabilities;
    }

    return {
      vulnerabilities: allVulnerabilities.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary,
      scanner: results.map(r => r.scanner).join(', '),
      scannedAt: new Date().toISOString(),
      packagesScanned: totalPackagesScanned,
      packagesWithVulnerabilities: totalPackagesWithVulns,
    };
  }

  /**
   * Get empty result for error cases
   */
  private getEmptyResult(scannerName: string = 'none'): SecurityScanResult {
    return {
      vulnerabilities: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      scanner: scannerName,
      scannedAt: new Date().toISOString(),
      packagesScanned: 0,
      packagesWithVulnerabilities: 0,
    };
  }

  /**
   * Find manifest files in project
   */
  async findManifestFiles(projectRoot: string): Promise<string[]> {
    const manifests: string[] = [];
    const commonManifests = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
      'pom.xml',
      'build.gradle',
      'go.mod',
      'Cargo.toml',
    ];

    for (const manifest of commonManifests) {
      const manifestPath = path.join(projectRoot, manifest);
      try {
        await fs.access(manifestPath);
        manifests.push(manifestPath);
      } catch {
        // File doesn't exist, skip
      }
    }

    return manifests;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
