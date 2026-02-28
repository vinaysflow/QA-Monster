/**
 * Auto-Fix Engine
 * Generates fix suggestions and patches for security and code quality issues
 */

import { QAInputPackage } from '../core/types.js';
import { FixSuggestion, FixResult } from './types.js';
import { Logger } from '../utils/logger.js';
import { DependencyFixer } from './fixers/DependencyFixer.js';
import { SecurityFixer } from './fixers/SecurityFixer.js';
import { CodeQualityFixer } from './fixers/CodeQualityFixer.js';
import { PatchGenerator } from './patch/PatchGenerator.js';

export class AutoFixEngine {
  private dependencyFixer: DependencyFixer;
  private securityFixer: SecurityFixer;
  private codeQualityFixer: CodeQualityFixer;
  private patchGenerator: PatchGenerator;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.dependencyFixer = new DependencyFixer();
    this.securityFixer = new SecurityFixer();
    this.codeQualityFixer = new CodeQualityFixer();
    this.patchGenerator = new PatchGenerator();
  }

  /**
   * Generate fix suggestions from QA package
   */
  async generateFixes(qaPackage: QAInputPackage): Promise<FixSuggestion[]> {
    this.logger.info('[AutoFixEngine] Generating fix suggestions');

    const fixes: FixSuggestion[] = [];

    // Generate dependency fixes
    if (qaPackage.security?.sca) {
      const dependencyFixes = await this.dependencyFixer.generateFixes(qaPackage.security.sca);
      fixes.push(...dependencyFixes);
    }

    // Generate security code fixes
    if (qaPackage.security?.sast) {
      const securityFixes = await this.securityFixer.generateFixes(qaPackage.security.sast, qaPackage);
      fixes.push(...securityFixes);
    }

    // Generate code quality fixes
    const qualityFixes = await this.codeQualityFixer.generateFixes(qaPackage);
    fixes.push(...qualityFixes);

    // Generate patches for all fixes
    for (const fix of fixes) {
      if (fix.currentCode && fix.suggestedCode) {
        fix.patch = this.patchGenerator.generatePatch(
          fix.file,
          fix.currentCode,
          fix.suggestedCode,
          fix.line
        );
      }
    }

    this.logger.info(`[AutoFixEngine] Generated ${fixes.length} fix suggestions`);
    return fixes;
  }

  /**
   * Apply a fix suggestion
   */
  async applyFix(fix: FixSuggestion, projectRoot: string): Promise<FixResult> {
    this.logger.info(`[AutoFixEngine] Applying fix: ${fix.id}`);

    try {
      const result = await this.patchGenerator.applyPatch(
        fix.patch || '',
        projectRoot,
        fix.file
      );

      return {
        applied: true,
        fixId: fix.id,
        file: fix.file,
        originalContent: result.originalContent,
        newContent: result.newContent,
        patch: fix.patch || '',
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[AutoFixEngine] Failed to apply fix:`, errorObj);
      const errorMessage = errorObj.message;
      return {
        applied: false,
        fixId: fix.id,
        file: fix.file,
        originalContent: '',
        newContent: '',
        patch: fix.patch || '',
        error: errorMessage,
      };
    }
  }
}
