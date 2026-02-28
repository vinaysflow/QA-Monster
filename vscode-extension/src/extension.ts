import * as vscode from 'vscode';
import { QAMonsterService } from './services/QAMonsterService';
import { ResultsProvider } from './views/ResultsProvider';
import { analyzeFile } from './commands/analyzeFile';
import { applyFix } from './commands/applyFix';

export function activate(context: vscode.ExtensionContext) {
  console.log('QA Monster extension is now active!');

  const service = new QAMonsterService();
  const resultsProvider = new ResultsProvider();

  // Register tree view
  const treeView = vscode.window.createTreeView('qaMonsterResults', {
    treeDataProvider: resultsProvider,
    showCollapseAll: true,
  });

  // Register commands
  const analyzeCommand = vscode.commands.registerCommand(
    'qaMonster.analyzeFile',
    () => analyzeFile(service, resultsProvider)
  );

  const applyFixCommand = vscode.commands.registerCommand(
    'qaMonster.applyFix',
    (fix: any) => applyFix(fix, service)
  );

  context.subscriptions.push(analyzeCommand, applyFixCommand, treeView);
}

export function deactivate() {}
