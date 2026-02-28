import * as vscode from 'vscode';
import { QAMonsterService } from '../services/QAMonsterService';
import { ResultsProvider } from '../views/ResultsProvider';

export async function analyzeFile(
  service: QAMonsterService,
  resultsProvider: ResultsProvider
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'QA Monster Analysis',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0, message: 'Starting analysis...' });

      try {
        const results = await service.analyzeFile(filePath);
        progress.report({ increment: 100, message: 'Analysis complete!' });

        resultsProvider.refresh(results);

        vscode.window.showInformationMessage(
          `QA Monster: Analysis complete for ${filePath.split('/').pop()}`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`QA Monster: ${error.message}`);
      }
    }
  );
}
