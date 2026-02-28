/**
 * Patch Generator
 * Generates unified diff patches for fix suggestions
 */

import { Logger } from '../../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PatchResult {
  originalContent: string;
  newContent: string;
  patch: string;
}

export class PatchGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Generate unified diff patch
   */
  generatePatch(
    filePath: string,
    oldCode: string,
    newCode: string,
    lineNumber: number
  ): string {
    const fileName = path.basename(filePath);
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    let patch = `--- a/${fileName}\n+++ b/${fileName}\n`;
    patch += `@@ -${lineNumber},${oldLines.length} +${lineNumber},${newLines.length} @@\n`;

    // Generate diff lines
    for (const oldLine of oldLines) {
      patch += `-${oldLine}\n`;
    }
    for (const newLine of newLines) {
      patch += `+${newLine}\n`;
    }

    return patch;
  }

  /**
   * Apply patch to file
   */
  async applyPatch(
    patch: string,
    projectRoot: string,
    filePath: string
  ): Promise<PatchResult> {
    const fullPath = path.join(projectRoot, filePath);
    
    try {
      const originalContent = await fs.readFile(fullPath, 'utf-8');
      const lines = originalContent.split('\n');
      
      // Parse patch and apply changes
      // This is a simplified implementation
      // Full implementation would properly parse unified diff format
      const patchLines = patch.split('\n');
      const newLines = [...lines];
      
      // Find the section to replace and apply changes
      // For now, return the original content
      // Full implementation would parse and apply the diff
      
      const newContent = originalContent; // Placeholder
      
      return {
        originalContent,
        newContent,
        patch,
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[PatchGenerator] Failed to apply patch:`, errorObj);
      throw errorObj;
    }
  }

  /**
   * Generate patch file content
   */
  generatePatchFile(fixes: Array<{ patch?: string; file: string }>): string {
    let patchContent = '';
    
    for (const fix of fixes) {
      if (fix.patch) {
        patchContent += fix.patch + '\n';
      }
    }
    
    return patchContent;
  }
}
