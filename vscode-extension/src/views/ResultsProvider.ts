import * as vscode from 'vscode';

export class ResultsProvider implements vscode.TreeDataProvider<ResultItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ResultItem | undefined | null | void> = new vscode.EventEmitter<ResultItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private results: any = null;

  refresh(results: any): void {
    this.results = results;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ResultItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ResultItem): Thenable<ResultItem[]> {
    if (!this.results) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root items
      const items: ResultItem[] = [];

      if (this.results.security) {
        items.push(new ResultItem('Security', vscode.TreeItemCollapsibleState.Collapsed, 'security'));
      }

      if (this.results.qualityGate) {
        items.push(new ResultItem('Quality Gates', vscode.TreeItemCollapsibleState.Collapsed, 'quality'));
      }

      if (this.results.fixes && this.results.fixes.length > 0) {
        items.push(new ResultItem('Fix Suggestions', vscode.TreeItemCollapsibleState.Collapsed, 'fixes'));
      }

      return Promise.resolve(items);
    }

    // Child items
    if (element.contextValue === 'security') {
      const items: ResultItem[] = [];
      if (this.results.security?.sca) {
        items.push(new ResultItem(
          `SCA: ${this.results.security.sca.summary.critical} critical, ${this.results.security.sca.summary.high} high`,
          vscode.TreeItemCollapsibleState.None,
          'sca-summary'
        ));
      }
      if (this.results.security?.sast) {
        items.push(new ResultItem(
          `SAST: ${this.results.security.sast.summary.critical} critical, ${this.results.security.sast.summary.high} high`,
          vscode.TreeItemCollapsibleState.None,
          'sast-summary'
        ));
      }
      return Promise.resolve(items);
    }

    if (element.contextValue === 'quality') {
      const qg = this.results.qualityGate;
      return Promise.resolve([
        new ResultItem(
          qg.passed ? '✅ PASSED' : '❌ FAILED',
          vscode.TreeItemCollapsibleState.None,
          'qg-status'
        ),
      ]);
    }

    if (element.contextValue === 'fixes') {
      return Promise.resolve(
        this.results.fixes.map((fix: any) =>
          new ResultItem(fix.description, vscode.TreeItemCollapsibleState.None, 'fix', fix)
        )
      );
    }

    return Promise.resolve([]);
  }
}

class ResultItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly fix?: any
  ) {
    super(label, collapsibleState);
    this.tooltip = label;
    this.contextValue = contextValue;
  }
}
