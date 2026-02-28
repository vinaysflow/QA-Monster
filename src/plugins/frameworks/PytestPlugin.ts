/**
 * Pytest framework plugin — generates test_*.py files for Python codebases.
 */

import {
  TestFrameworkPlugin,
  AssertionSyntax,
  GeneratedTests,
} from '../interfaces.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export class PytestPlugin implements TestFrameworkPlugin {
  name = 'pytest';

  async detect(projectRoot: string): Promise<boolean> {
    try {
      const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
      if (await this.fileExists(pyprojectPath)) {
        const content = await fs.readFile(pyprojectPath, 'utf-8');
        if (content.includes('pytest') || content.includes('[tool.pytest')) {
          return true;
        }
      }
      const reqPath = path.join(projectRoot, 'requirements.txt');
      if (await this.fileExists(reqPath)) {
        const content = await fs.readFile(reqPath, 'utf-8');
        if (content.includes('pytest')) return true;
      }
      const setupPath = path.join(projectRoot, 'setup.py');
      if (await this.fileExists(setupPath)) {
        const content = await fs.readFile(setupPath, 'utf-8');
        if (content.includes('pytest')) return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  getTestTemplate(): string {
    return `import pytest

class Test{{functionName}}:
    {{#each testCases}}
    def test_{{snake name}}(self):
        # Arrange
        {{arrange}}
        
        # Act
        {{act}}
        
        # Assert
        {{assert}}
    {{/each}}
`;
  }

  getAssertionSyntax(): AssertionSyntax {
    return {
      equals: 'assert actual == expected',
      notEquals: 'assert actual != expected',
      truthy: 'assert actual',
      falsy: 'assert not actual',
      throws: 'pytest.raises(ExpectedException): fn()',
      async: 'assert await promise == value',
      contains: 'assert expected in actual',
      greaterThan: 'assert actual > expected',
      lessThan: 'assert actual < expected',
    };
  }

  formatTests(code: string, qaPackage: any): GeneratedTests {
    const testCount = (code.match(/def test_/g) || []).length;
    const targetPath = qaPackage.codeContext?.targetFile?.path || '';
    const testFilePath = this.generateTestFilePath(targetPath);
    const formattedCode = this.addImports(code, qaPackage);

    return {
      code: formattedCode,
      filePath: testFilePath,
      framework: 'pytest',
      testCount,
    };
  }

  private generateTestFilePath(targetPath: string): string {
    if (!targetPath) return 'test_generated.py';
    const dir = path.dirname(targetPath);
    const basename = path.basename(targetPath, path.extname(targetPath));
    return path.join(dir, `test_${basename}.py`);
  }

  private addImports(code: string, qaPackage: any): string {
    if (code.includes('import pytest') || code.includes('import unittest')) {
      return this.addTargetImports(code, qaPackage);
    }

    const targetFile = qaPackage.codeContext?.targetFile;
    if (!targetFile) {
      return `import pytest\n\n${code}`;
    }

    const relativePath = this.getRelativeImportPath(
      targetFile.path,
      qaPackage.codeContext?.targetFile?.path || ''
    );
    const modulePath = relativePath.replace(/\.py$/, '').split('/').join('.');
    const exports = this.getExports(targetFile);
    const targetImport = `import pytest\nfrom ${modulePath} import ${exports}\n\n${code}`;
    return targetImport;
  }

  private addTargetImports(code: string, qaPackage: any): string {
    const targetFile = qaPackage.codeContext?.targetFile;
    if (!targetFile || code.includes(' from ') || code.includes(' import ')) {
      return code;
    }
    const relativePath = this.getRelativeImportPath(
      targetFile.path,
      qaPackage.codeContext?.targetFile?.path || ''
    );
    const modulePath = relativePath.replace(/\.py$/, '').split('/').join('.');
    const exports = this.getExports(targetFile);
    return `from ${modulePath} import ${exports}\n\n${code}`;
  }

  private getExports(file: any): string {
    const exports = file.exports || [];
    if (exports.length === 0) return '*';
    return exports.map((e: any) => e.name).join(', ');
  }

  private getRelativeImportPath(from: string, to: string): string {
    const fromDir = path.dirname(from);
    const toDir = path.dirname(to);
    const toBasename = path.basename(to, path.extname(to));
    let relative = path.relative(fromDir, toDir);
    if (relative === '') {
      relative = '.';
    } else {
      relative = relative.replace(/\\/g, '/');
      if (!relative.startsWith('.')) {
        relative = './' + relative;
      }
    }
    return `${relative}/${toBasename}.py`;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
