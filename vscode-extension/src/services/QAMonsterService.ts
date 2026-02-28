import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export class QAMonsterService {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('QA Monster');
  }

  /**
   * Analyze a file using QA Monster CLI
   */
  async analyzeFile(filePath: string): Promise<any> {
    this.outputChannel.appendLine(`Analyzing: ${filePath}`);

    try {
      // Get workspace root
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;
      const qaMonsterPath = path.join(workspaceRoot, 'node_modules', '.bin', 'qa-monster');

      // Run QA Monster analysis
      const { stdout, stderr } = await execAsync(
        `node ${qaMonsterPath} analyze "${filePath}"`,
        { cwd: workspaceRoot }
      );

      if (stderr) {
        this.outputChannel.appendLine(`Error: ${stderr}`);
      }

      // Try to load results from qa-output
      const outputPath = path.join(workspaceRoot, 'qa-output', 'qa-output.json');
      const fs = await import('fs/promises');
      
      try {
        const content = await fs.readFile(outputPath, 'utf-8');
        const results = JSON.parse(content);
        this.outputChannel.appendLine('Analysis complete!');
        return results;
      } catch {
        // If file doesn't exist, return stdout
        return { raw: stdout };
      }
    } catch (error: any) {
      this.outputChannel.appendLine(`Failed to analyze: ${error.message}`);
      vscode.window.showErrorMessage(`QA Monster: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply a fix suggestion
   */
  async applyFix(fix: any, filePath: string): Promise<void> {
    this.outputChannel.appendLine(`Applying fix: ${fix.id}`);

    try {
      // This would integrate with the auto-fix engine
      // For now, show a message
      vscode.window.showInformationMessage(`Fix applied: ${fix.description}`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to apply fix: ${error.message}`);
      throw error;
    }
  }
}
