import * as path from 'path';
import * as fs from 'fs/promises';
import { ProjectInfo } from './types.js';

/**
 * Project Detector - Auto-detects project type, languages, and frameworks
 */
export class ProjectDetector {
  constructor(private projectRoot: string) {}

  async detect(targetPath: string): Promise<ProjectInfo> {
    const info: ProjectInfo = {
      type: 'single',
      languages: [],
      frameworks: [],
      testFrameworks: [],
      root: await this.findProjectRoot(targetPath),
    };

    // Detect languages
    await this.detectLanguages(info);

    // Detect test frameworks
    await this.detectTestFrameworks(info);

    // Detect project structure
    info.type = await this.detectProjectStructure(info.root);

    return info;
  }

  private async findProjectRoot(targetPath: string): Promise<string> {
    let current = path.resolve(targetPath);
    if (!path.isAbsolute(targetPath)) {
      current = path.resolve(this.projectRoot, targetPath);
    }

    // If it's a file, get its directory
    try {
      const fsSync = await import('fs');
      const stat = fsSync.statSync(current);
      if (stat.isFile()) {
        current = path.dirname(current);
      }
    } catch {
      // Ignore
    }

    // Walk up to find project root (has package.json, tsconfig.json, pyproject.toml, etc.)
    let root = current;
    while (root !== path.dirname(root)) {
      const packageJson = path.join(root, 'package.json');
      const tsConfig = path.join(root, 'tsconfig.json');
      const pyproject = path.join(root, 'pyproject.toml');
      const requirements = path.join(root, 'requirements.txt');

      try {
        if (await this.fileExists(packageJson) || await this.fileExists(tsConfig)) {
          return root;
        }
        if (await this.fileExists(pyproject) || await this.fileExists(requirements)) {
          return root;
        }
      } catch {
        // Continue
      }

      root = path.dirname(root);
    }

    return this.projectRoot;
  }

  private async detectLanguages(info: ProjectInfo): Promise<void> {
    const packageJsonPath = path.join(info.root, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check for TypeScript
      if (
        packageJson.devDependencies?.typescript ||
        packageJson.dependencies?.typescript ||
        await this.fileExists(path.join(info.root, 'tsconfig.json'))
      ) {
        info.languages.push('typescript');
      }
      
      // JavaScript is always possible if package.json exists
      if (packageJson) {
        info.languages.push('javascript');
      }
    } catch {
      // No package.json
    }

    // Check for Python
    if (await this.fileExists(path.join(info.root, 'requirements.txt'))) {
      info.languages.push('python');
    }
    if (await this.fileExists(path.join(info.root, 'pyproject.toml'))) {
      info.languages.push('python');
    }

    // Check for Java
    if (await this.fileExists(path.join(info.root, 'pom.xml'))) {
      info.languages.push('java');
    }
    if (await this.fileExists(path.join(info.root, 'build.gradle'))) {
      info.languages.push('java');
    }

    // Check for Go
    if (await this.fileExists(path.join(info.root, 'go.mod'))) {
      info.languages.push('go');
    }

    // Default to TypeScript/JavaScript if nothing detected
    if (info.languages.length === 0) {
      info.languages.push('typescript', 'javascript');
    }
  }

  private async detectTestFrameworks(info: ProjectInfo): Promise<void> {
    const packageJsonPath = path.join(info.root, 'package.json');

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
        info.testFrameworks.push('jest');
      }
      if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
        info.testFrameworks.push('vitest');
      }
      if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
        info.testFrameworks.push('mocha');
      }
    } catch {
      // No package.json
    }

    // Python: detect pytest
    if (info.languages.includes('python')) {
      try {
        const pyprojectPath = path.join(info.root, 'pyproject.toml');
        if (await this.fileExists(pyprojectPath)) {
          const content = await fs.readFile(pyprojectPath, 'utf-8');
          if (content.includes('pytest') || content.includes('[tool.pytest')) {
            info.testFrameworks.push('pytest');
          }
        }
        const reqPath = path.join(info.root, 'requirements.txt');
        if (await this.fileExists(reqPath)) {
          const content = await fs.readFile(reqPath, 'utf-8');
          if (content.includes('pytest')) {
            if (!info.testFrameworks.includes('pytest')) {
              info.testFrameworks.push('pytest');
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  private async detectProjectStructure(root: string): Promise<'monorepo' | 'single' | 'multi'> {
    // Check for monorepo indicators
    const lernaJson = path.join(root, 'lerna.json');
    const pnpmWorkspace = path.join(root, 'pnpm-workspace.yaml');
    const nxJson = path.join(root, 'nx.json');
    const rushJson = path.join(root, 'rush.json');

    if (
      (await this.fileExists(lernaJson)) ||
      (await this.fileExists(pnpmWorkspace)) ||
      (await this.fileExists(nxJson)) ||
      (await this.fileExists(rushJson))
    ) {
      return 'monorepo';
    }

    // Check for multiple package.json files (multi-project)
    const packageJson = path.join(root, 'package.json');
    if (await this.fileExists(packageJson)) {
      try {
        const pkg = JSON.parse(await fs.readFile(packageJson, 'utf-8'));
        if (pkg.workspaces || pkg.workspace) {
          return 'monorepo';
        }
      } catch {
        // Ignore
      }
    }

    return 'single';
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
