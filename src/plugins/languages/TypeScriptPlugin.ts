import {
  LanguagePlugin,
  ParsedFile,
  Dependency,
  FunctionInfo,
  ClassInfo,
  TypeInfo,
  ImportInfo,
  ExportInfo,
  ParameterInfo,
  PropertyInfo,
} from '../interfaces.js';
import { Project, SourceFile, FunctionDeclaration, ClassDeclaration } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';

export class TypeScriptPlugin implements LanguagePlugin {
  name = 'typescript';
  extensions = ['.ts', '.tsx', '.js', '.jsx'];

  private project: Project;

  constructor(tsConfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath || 'tsconfig.json',
      skipAddingFilesFromTsConfig: true,
    });
  }

  async parseFile(filePath: string): Promise<ParsedFile> {
    try {
      // Add file to project if not already added
      let sourceFile = this.project.getSourceFile(filePath);
      if (!sourceFile) {
        sourceFile = this.project.addSourceFileAtPath(filePath);
      }

      return {
        path: filePath,
        content: sourceFile.getFullText(),
        functions: this.extractFunctions(sourceFile),
        classes: this.extractClasses(sourceFile),
        types: this.extractTypes(sourceFile),
        imports: this.extractImports(sourceFile),
        exports: this.extractExports(sourceFile),
      };
    } catch (error) {
      throw new Error(`Failed to parse TypeScript file ${filePath}: ${error}`);
    }
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
          type: imp.isTypeOnly ? 'type' : 'direct',
          relationship: 'imports',
          resolved: true,
        });
      }
    }

    return dependencies;
  }

  async detectTestFramework(projectRoot: string): Promise<string | null> {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
        return 'jest';
      }
      if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
        return 'vitest';
      }
      if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
        return 'mocha';
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractFunctions(sourceFile: SourceFile): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    sourceFile.getFunctions().forEach((func) => {
      const parameters: ParameterInfo[] = func.getParameters().map((param) => ({
        name: param.getName(),
        type: param.getType().getText(),
        optional: param.hasQuestionToken(),
        defaultValue: param.getInitializer()?.getText(),
      }));

      functions.push({
        name: func.getName() || 'anonymous',
        parameters,
        returnType: func.getReturnType().getText(),
        isAsync: func.isAsync(),
        lineStart: func.getStartLineNumber(),
        lineEnd: func.getEndLineNumber(),
        body: func.getBody()?.getText(),
      });
    });

    // Also extract methods from classes
    sourceFile.getClasses().forEach((cls) => {
      cls.getMethods().forEach((method) => {
        const parameters: ParameterInfo[] = method.getParameters().map((param) => ({
          name: param.getName(),
          type: param.getType().getText(),
          optional: param.hasQuestionToken(),
          defaultValue: param.getInitializer()?.getText(),
        }));

        functions.push({
          name: `${cls.getName()}.${method.getName()}`,
          parameters,
          returnType: method.getReturnType().getText(),
          isAsync: method.isAsync(),
          lineStart: method.getStartLineNumber(),
          lineEnd: method.getEndLineNumber(),
          body: method.getBody()?.getText(),
        });
      });
    });

    return functions;
  }

  private extractClasses(sourceFile: SourceFile): ClassInfo[] {
    const classes: ClassInfo[] = [];

    sourceFile.getClasses().forEach((cls) => {
      const methods: FunctionInfo[] = cls.getMethods().map((method) => ({
        name: method.getName(),
        parameters: method.getParameters().map((param) => ({
          name: param.getName(),
          type: param.getType().getText(),
          optional: param.hasQuestionToken(),
          defaultValue: param.getInitializer()?.getText(),
        })),
        returnType: method.getReturnType().getText(),
        isAsync: method.isAsync(),
        lineStart: method.getStartLineNumber(),
        lineEnd: method.getEndLineNumber(),
        body: method.getBody()?.getText(),
      }));

      const properties: PropertyInfo[] = cls.getProperties().map((prop) => ({
        name: prop.getName(),
        type: prop.getType().getText(),
        optional: prop.hasQuestionToken(),
      }));

      classes.push({
        name: cls.getName() || 'Anonymous',
        methods,
        properties,
        lineStart: cls.getStartLineNumber(),
        lineEnd: cls.getEndLineNumber(),
      });
    });

    return classes;
  }

  private extractTypes(sourceFile: SourceFile): TypeInfo[] {
    const types: TypeInfo[] = [];

    // Type aliases
    sourceFile.getTypeAliases().forEach((typeAlias) => {
      types.push({
        name: typeAlias.getName(),
        definition: typeAlias.getType().getText(),
      });
    });

    // Interfaces
    sourceFile.getInterfaces().forEach((iface) => {
      const properties: PropertyInfo[] = iface.getProperties().map((prop) => ({
        name: prop.getName(),
        type: prop.getType().getText(),
        optional: prop.hasQuestionToken(),
      }));

      types.push({
        name: iface.getName(),
        definition: iface.getText(),
        properties,
      });
    });

    return types;
  }

  private extractImports(sourceFile: SourceFile): ImportInfo[] {
    return sourceFile.getImportDeclarations().map((imp) => ({
      from: imp.getModuleSpecifierValue(),
      imports: imp.getNamedImports().map((ni) => ni.getName()),
      isTypeOnly: imp.isTypeOnly(),
      defaultImport: imp.getDefaultImport()?.getText(),
    }));
  }

  private extractExports(sourceFile: SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // Named exports
    sourceFile.getExportedDeclarations().forEach((declarations, name) => {
      declarations.forEach((decl) => {
        let type: ExportInfo['type'] = 'constant';
        const kindName = decl.getKindName();
        if (kindName === 'FunctionDeclaration') type = 'function';
        else if (kindName === 'ClassDeclaration') type = 'class';
        else if (kindName === 'TypeAliasDeclaration' || kindName === 'InterfaceDeclaration')
          type = 'type';

        exports.push({ name, type });
      });
    });

    // Default export
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (defaultExport) {
      exports.push({ name: 'default', type: 'function' });
    }

    return exports;
  }

  private async resolveImport(
    importPath: string,
    fromFile: string,
    projectRoot: string
  ): Promise<string | null> {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      return await this.resolveRelative(importPath, fromFile);
    }

    // Handle path aliases (@/components)
    if (importPath.startsWith('@/')) {
      return await this.resolveAlias(importPath, projectRoot);
    }

    // Skip node_modules for now (can be configurable)
    return null;
  }

  private async resolveRelative(
    importPath: string,
    fromFile: string
  ): Promise<string | null> {
    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importPath);

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (await this.fileExists(fullPath)) {
        return fullPath;
      }
    }

    // Try as directory with index
    if (await this.isDirectory(resolved)) {
      const indexPath = path.join(resolved, 'index.ts');
      if (await this.fileExists(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  private async resolveAlias(
    importPath: string,
    projectRoot: string
  ): Promise<string | null> {
    // Remove @/ prefix
    const relativePath = importPath.replace('@/', '');
    const resolved = path.resolve(projectRoot, 'src', relativePath);

    const extensions = ['.ts', '.tsx', '/index.ts'];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (await this.fileExists(fullPath)) {
        return fullPath;
      }
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

  private async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
