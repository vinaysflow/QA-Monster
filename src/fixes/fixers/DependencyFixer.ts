/**
 * Dependency Fixer
 * Generates fixes for vulnerable dependencies
 */

import { SecurityScanResult } from '../../security/types.js';
import { FixSuggestion } from '../types.js';
import { Logger } from '../../utils/logger.js';

export class DependencyFixer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Generate fix suggestions for vulnerable dependencies
   */
  async generateFixes(scanResult: SecurityScanResult): Promise<FixSuggestion[]> {
    const fixes: FixSuggestion[] = [];

    for (const vuln of scanResult.vulnerabilities) {
      if (vuln.fixVersion) {
        fixes.push({
          id: `dep-fix-${vuln.id}`,
          issueId: vuln.id,
          type: 'dependency-update',
          severity: vuln.severity,
          description: `Update ${vuln.package} from ${vuln.version} to ${vuln.fixVersion} to fix vulnerability`,
          suggestedCode: `"${vuln.package}": "${vuln.fixVersion}"`,
          confidence: 0.9,
          file: vuln.filePath || 'package.json',
          line: vuln.lineNumber || 1,
          explanation: `Vulnerability ${vuln.cve || vuln.id}: ${vuln.description}. Update to version ${vuln.fixVersion} to resolve.`,
        });
      }
    }

    this.logger.info(`[DependencyFixer] Generated ${fixes.length} dependency fix suggestions`);
    return fixes;
  }
}
