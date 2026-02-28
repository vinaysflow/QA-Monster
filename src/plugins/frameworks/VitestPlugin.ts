import {
  TestFrameworkPlugin,
  AssertionSyntax,
  GeneratedTests,
} from '../interfaces.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export class VitestPlugin implements TestFrameworkPlugin {
  name = 'vitest';

  async detect(projectRoot: string): Promise<boolean> {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      return !!(
        packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest
      );
    } catch {
      return false;
    }
  }

  getTestTemplate(): string {
    return `import { describe, it, expect } from 'vitest';

describe('{{functionName}}', () => {
  {{#each testCases}}
  it('{{name}}', {{#if async}}async {{/if}}() => {
    // Arrange
    {{arrange}}
    
    // Act
    {{act}}
    
    // Assert
    {{assert}}
  });
  {{/each}}
});`;
  }

  getAssertionSyntax(): AssertionSyntax {
    return {
      equals: 'expect(actual).toBe(expected)',
      notEquals: 'expect(actual).not.toBe(expected)',
      truthy: 'expect(actual).toBeTruthy()',
      falsy: 'expect(actual).toBeFalsy()',
      throws: 'expect(() => fn()).toThrow()',
      async: 'await expect(promise).resolves.toBe(value)',
      contains: 'expect(actual).toContain(expected)',
      greaterThan: 'expect(actual).toBeGreaterThan(expected)',
      lessThan: 'expect(actual).toBeLessThan(expected)',
    };
  }

  formatTests(code: string, qaPackage: any): GeneratedTests {
    // Extract test count from code
    const testCount = (code.match(/it\(/g) || []).length;

    // Generate test file path
    const targetPath = qaPackage.codeContext?.targetFile?.path || '';
    const testFilePath = this.generateTestFilePath(targetPath);

    // Add necessary imports if not present
    const formattedCode = this.addImports(code, qaPackage);

    return {
      code: formattedCode,
      filePath: testFilePath,
      framework: 'vitest',
      testCount,
    };
  }

  private generateTestFilePath(targetPath: string): string {
    if (!targetPath) return 'test.generated.test.ts';

    const dir = path.dirname(targetPath);
    const basename = path.basename(targetPath, path.extname(targetPath));
    return path.join(dir, `${basename}.test.ts`);
  }

  private addImports(code: string, qaPackage: any): string {
    // Check if vitest imports already exist
    if (code.includes("from 'vitest'")) {
      // Just add target imports if needed
      return this.addTargetImports(code, qaPackage);
    }

    const targetFile = qaPackage.codeContext?.targetFile;
    if (!targetFile) {
      return `import { describe, it, expect } from 'vitest';\n\n${code}`;
    }

    // Generate import statements
    const relativePath = this.getRelativeImportPath(
      targetFile.path,
      qaPackage.codeContext?.targetFile?.path || ''
    );

    const vitestImport = "import { describe, it, expect } from 'vitest';\n";
    const targetImport = `import { ${this.getExports(targetFile)} } from '${relativePath}';\n\n`;

    return vitestImport + targetImport + code;
  }

  private addTargetImports(code: string, qaPackage: any): string {
    const targetFile = qaPackage.codeContext?.targetFile;
    if (!targetFile || code.includes('from')) {
      return code;
    }

    const relativePath = this.getRelativeImportPath(
      targetFile.path,
      qaPackage.codeContext?.targetFile?.path || ''
    );

    const targetImport = `import { ${this.getExports(targetFile)} } from '${relativePath}';\n\n`;

    return targetImport + code;
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
      relative = './';
    } else {
      relative = relative.replace(/\\/g, '/');
      if (!relative.startsWith('.')) {
        relative = './' + relative;
      }
    }

    return `${relative}/${toBasename}`;
  }
}
