/**
 * Python language plugin — parses .py files via a small Python AST script.
 * Requires Python 3.9+ on the path (for ast.unparse). Used for enterprise Python codebases.
 */

import {
  LanguagePlugin,
  ParsedFile,
  Dependency,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
} from '../interfaces.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/parse_python_ast.py');

export class PythonPlugin implements LanguagePlugin {
  name = 'python';
  extensions = ['.py'];

  private pythonPath: string = 'python3';

  constructor(pythonPath?: string) {
    if (pythonPath) this.pythonPath = pythonPath;
  }

  async parseFile(filePath: string): Promise<ParsedFile> {
    const resolved = path.resolve(filePath);
    try {
      const json = await this.runPythonScript(resolved);
      if (json.error) {
        throw new Error(String(json.error));
      }
      const pathVal = json.path != null ? String(json.path) : resolved;
      const contentVal = json.content != null ? String(json.content) : '';
      const functions = Array.isArray(json.functions)
        ? (json.functions as Record<string, unknown>[]).map((f) => this.normalizeFunction(f))
        : [];
      const classes = Array.isArray(json.classes)
        ? (json.classes as Record<string, unknown>[]).map((c) => this.normalizeClass(c))
        : [];
      const types = Array.isArray(json.types) ? (json.types as import('../interfaces.js').TypeInfo[]) : [];
      const imports = Array.isArray(json.imports)
        ? (json.imports as Record<string, unknown>[]).map((i) => this.normalizeImport(i))
        : [];
      const exports = Array.isArray(json.exports)
        ? (json.exports as Record<string, unknown>[]).map((e) => this.normalizeExport(e))
        : [];
      return {
        path: pathVal,
        content: contentVal,
        functions,
        classes,
        types,
        imports,
        exports,
      };
    } catch (err) {
      throw new Error(
        `Failed to parse Python file ${filePath}: ${(err as Error).message}`
      );
    }
  }

  private runPythonScript(filePath: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, [SCRIPT_PATH, filePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      proc.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
      proc.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code !== 0) {
          try {
            const errObj = JSON.parse(stderr.trim());
            reject(new Error(errObj.error || stderr));
          } catch {
            reject(new Error(stderr || `Python script exited with ${code}`));
          }
          return;
        }
        try {
          resolve(JSON.parse(stdout) as Record<string, unknown>);
        } catch {
          reject(new Error('Invalid JSON from Python parser'));
        }
      });
    });
  }

  private normalizeFunction(raw: Record<string, unknown>): FunctionInfo {
    return {
      name: String(raw.name ?? ''),
      parameters: Array.isArray(raw.parameters)
        ? (raw.parameters as Record<string, unknown>[]).map((p) => ({
            name: String(p.name ?? ''),
            type: String(p.type ?? ''),
            optional: Boolean(p.optional),
            defaultValue: p.defaultValue != null ? String(p.defaultValue) : undefined,
          }))
        : [],
      returnType: String(raw.returnType ?? ''),
      isAsync: Boolean(raw.isAsync),
      lineStart: Number(raw.lineStart) || 0,
      lineEnd: Number(raw.lineEnd) || 0,
      body: raw.body != null ? String(raw.body) : undefined,
    };
  }

  private normalizeClass(raw: Record<string, unknown>): ClassInfo {
    return {
      name: String(raw.name ?? ''),
      methods: Array.isArray(raw.methods)
        ? (raw.methods as Record<string, unknown>[]).map(this.normalizeFunction)
        : [],
      properties: Array.isArray(raw.properties)
        ? (raw.properties as Record<string, unknown>[]).map((p) => ({
            name: String(p.name ?? ''),
            type: String(p.type ?? ''),
            optional: Boolean(p.optional),
          }))
        : [],
      lineStart: Number(raw.lineStart) || 0,
      lineEnd: Number(raw.lineEnd) || 0,
    };
  }

  private normalizeImport(raw: Record<string, unknown>): ImportInfo {
    return {
      from: String(raw.from ?? ''),
      imports: Array.isArray(raw.imports) ? (raw.imports as string[]) : [],
      isTypeOnly: Boolean(raw.isTypeOnly),
      defaultImport: raw.defaultImport != null ? String(raw.defaultImport) : undefined,
    };
  }

  private normalizeExport(raw: Record<string, unknown>): ExportInfo {
    return {
      name: String(raw.name ?? ''),
      type: (raw.type as ExportInfo['type']) || 'function',
    };
  }

  async findDependencies(
    file: ParsedFile,
    projectRoot: string
  ): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];

    for (const imp of file.imports || []) {
      const resolved = await this.resolveImport(imp.from, file.path, projectRoot);
      if (resolved) {
        dependencies.push({
          path: resolved,
          type: 'direct',
          relationship: 'imports',
          resolved: true,
        });
      }
    }

    return dependencies;
  }

  private async resolveImport(
    importPath: string,
    fromFile: string,
    projectRoot: string
  ): Promise<string | null> {
    const fromDir = path.dirname(fromFile);

    if (importPath.startsWith('.')) {
      const relative = path.resolve(fromDir, importPath);
      const withPy = relative + '.py';
      if (await this.fileExists(withPy)) return withPy;
      const initPath = path.join(relative, '__init__.py');
      if (await this.fileExists(initPath)) return initPath;
      return null;
    }

    const topLevel = importPath.split('.')[0];
    const candidateDirs = [
      path.join(projectRoot, topLevel),
      path.join(projectRoot, 'src', topLevel),
      path.join(fromDir, topLevel),
    ];
    for (const dir of candidateDirs) {
      const init = path.join(dir, '__init__.py');
      if (await this.fileExists(init)) return init;
      const mod = dir + '.py';
      if (await this.fileExists(mod)) return mod;
    }
    return null;
  }

  async detectTestFramework(projectRoot: string): Promise<string | null> {
    try {
      const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
      if (await this.fileExists(pyprojectPath)) {
        const content = await fs.readFile(pyprojectPath, 'utf-8');
        if (content.includes('pytest') || content.includes('[tool.pytest')) {
          return 'pytest';
        }
      }
      const requirementsPaths = [
        path.join(projectRoot, 'requirements.txt'),
        path.join(projectRoot, 'requirements-test.txt'),
        path.join(projectRoot, 'requirements_dev.txt'),
      ];
      for (const reqPath of requirementsPaths) {
        if (await this.fileExists(reqPath)) {
          const content = await fs.readFile(reqPath, 'utf-8');
          if (content.includes('pytest')) return 'pytest';
        }
      }
      if (await this.fileExists(path.join(projectRoot, 'setup.py'))) {
        const content = await fs.readFile(path.join(projectRoot, 'setup.py'), 'utf-8');
        if (content.includes('pytest')) return 'pytest';
      }
    } catch {
      // ignore
    }
    return null;
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
