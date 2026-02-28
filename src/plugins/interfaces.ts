/**
 * Plugin interfaces for language and test framework support
 */

export interface ParsedFile {
  path: string;
  content: string;
  functions?: FunctionInfo[];
  classes?: ClassInfo[];
  types?: TypeInfo[];
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  ast?: any;
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  complexity?: number;
  lineStart: number;
  lineEnd: number;
  body?: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  lineStart: number;
  lineEnd: number;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface TypeInfo {
  name: string;
  definition: string;
  properties?: PropertyInfo[];
}

export interface ImportInfo {
  from: string;
  imports: string[];
  isTypeOnly: boolean;
  defaultImport?: string;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'type' | 'constant' | 'default' | 'interface';
}

export interface Dependency {
  path: string;
  type: 'direct' | 'transitive' | 'type' | 'constant';
  relationship: string;
  resolved: boolean;
}

export interface AssertionSyntax {
  equals: string;
  notEquals: string;
  truthy: string;
  falsy: string;
  throws: string;
  async: string;
  contains?: string;
  greaterThan?: string;
  lessThan?: string;
}

export interface GeneratedTests {
  code: string;
  filePath: string;
  framework: string;
  testCount: number;
}

export interface LanguagePlugin {
  name: string;
  extensions: string[];
  parseFile(filePath: string): Promise<ParsedFile>;
  findDependencies(
    file: ParsedFile,
    projectRoot: string
  ): Promise<Dependency[]>;
  detectTestFramework(projectRoot: string): Promise<string | null>;
}

export interface TestFrameworkPlugin {
  name: string;
  detect(projectRoot: string): Promise<boolean>;
  getTestTemplate(): string;
  getAssertionSyntax(): AssertionSyntax;
  formatTests(code: string, qaPackage: any): GeneratedTests;
}
