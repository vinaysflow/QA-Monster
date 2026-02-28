import * as vscode from 'vscode';
import { QAMonsterService } from '../services/QAMonsterService';

export async function applyFix(fix: any, service: QAMonsterService) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const filePath = editor.document.uri.fsPath;

  try {
    await service.applyFix(fix, filePath);
    vscode.window.showInformationMessage(`Fix applied: ${fix.description}`);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to apply fix: ${error.message}`);
  }
}
