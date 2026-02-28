import {
  TestFrameworkPlugin,
  AssertionSyntax,
  GeneratedTests,
} from '../interfaces.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export class JestPlugin implements TestFrameworkPlugin {
  name = 'jest';

  async detect(projectRoot: string): Promise<boolean> {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      return !!(
        packageJson.devDependencies?.jest || packageJson.dependencies?.jest
      );
    } catch {
      return false;
    }
  }

  getTestTemplate(): string {
    return `describe('{{functionName}}', () => {
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
      framework: 'jest',
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
    // Check if imports already exist
    if (code.includes('import') || code.includes('require')) {
      return code;
    }

    const targetFile = qaPackage.codeContext?.targetFile;
    if (!targetFile) return code;

    // Generate import statement
    const relativePath = this.getRelativeImportPath(
      targetFile.path,
      qaPackage.codeContext?.targetFile?.path || ''
    );

    const importStatement = `import { ${this.getExports(targetFile)} } from '${relativePath}';\n\n`;

    return importStatement + code;
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
