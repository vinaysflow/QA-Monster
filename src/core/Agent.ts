import { EventEmitter } from 'events';
import { PluginRegistry } from '../plugins/PluginRegistry.js';
import { LanguagePlugin, TestFrameworkPlugin } from '../plugins/interfaces.js';
import { ProjectDetector } from './ProjectDetector.js';
import { CodeAnalyzer } from '../analysis/CodeAnalyzer.js';
import { DependencyDiscoverer } from '../analysis/DependencyDiscoverer.js';
import { LargeCodebaseHandler } from '../analysis/LargeCodebaseHandler.js';
import { LLMService } from '../llm/LLMService.js';
import { CacheManager } from '../cache/CacheManager.js';
import { Logger } from '../utils/logger.js';
import { SecurityScanner } from '../security/SecurityScanner.js';
import { SnykScanner } from '../security/scanners/SnykScanner.js';
import { NpmAuditScanner } from '../security/scanners/NpmAuditScanner.js';
import { SASTAnalyzer } from '../security/SASTAnalyzer.js';
import { QualityGate } from '../quality/QualityGate.js';
import { AutoFixEngine } from '../fixes/AutoFixEngine.js';
import {
  QAInputPackage,
  ProcessOptions,
  TestGenerationOptions,
  GeneratedTests,
  CodeContext,
  Understanding,
  CodeAnalysis,
} from './types.js';
import { ParsedFile } from '../plugins/interfaces.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Core Agent - Orchestrates the entire process
 * 
 * First Principles:
 * 1. Read code accurately
 * 2. Understand context completely
 * 3. Generate tests comprehensively
 * 4. Do it fast and reliably
 */
export class CodeReadingAgent extends EventEmitter {
  private pluginRegistry: PluginRegistry;
  private projectDetector: ProjectDetector;
  private codeAnalyzer: CodeAnalyzer;
  private dependencyDiscoverer: DependencyDiscoverer;
  private largeCodebaseHandler: LargeCodebaseHandler;
  private llmService: LLMService;
  private cache: CacheManager;
  private logger: Logger;
  private securityScanner: SecurityScanner;
  private sastAnalyzer: SASTAnalyzer;
  private qualityGate: QualityGate;
  private autoFixEngine: AutoFixEngine;
  private projectRoot: string;
  private tsConfigPath?: string;
  private pluginsRegistered: boolean;

  constructor(
    projectRoot: string = process.cwd(),
    tsConfigPath?: string,
    openAIApiKey?: string
  ) {
    super();
    this.projectRoot = projectRoot;
    this.pluginRegistry = new PluginRegistry();
    this.projectDetector = new ProjectDetector(projectRoot);
    this.codeAnalyzer = new CodeAnalyzer();
    this.dependencyDiscoverer = new DependencyDiscoverer(
      this.pluginRegistry,
      projectRoot
    );
    this.largeCodebaseHandler = new LargeCodebaseHandler();
    this.llmService = new LLMService(openAIApiKey);
    this.cache = new CacheManager();
    this.logger = new Logger();
    
    // Initialize security scanner
    this.securityScanner = new SecurityScanner();
    this.securityScanner.registerScanner(new SnykScanner(process.env.SNYK_API_KEY));
    this.securityScanner.registerScanner(new NpmAuditScanner());
    
    // Initialize SAST analyzer
    this.sastAnalyzer = new SASTAnalyzer();
    
    // Initialize quality gate
    this.qualityGate = new QualityGate();
    
    // Initialize auto-fix engine
    this.autoFixEngine = new AutoFixEngine();

    // Plugins will be registered on first use
    this.tsConfigPath = tsConfigPath;
    this.pluginsRegistered = false;
  }

  /**
   * Main entry point - process a file or directory
   */
  async process(
    target: string,
    options?: ProcessOptions
  ): Promise<QAInputPackage> {
    const startTime = Date.now();
    this.emit('start', { target });
    this.logger.info(`[Agent] Starting analysis of ${target}`);

    try {
      // Ensure plugins are registered
      if (!this.pluginsRegistered) {
        await this.registerBuiltInPlugins(this.tsConfigPath);
        this.pluginsRegistered = true;
      }

      // Step 1: Detect project context (fast, cached)
      const projectInfo = await this.detectProject(target);
      this.emit('project-detected', projectInfo);
      this.logger.info(`[Agent] Detected project: ${projectInfo.languages.join(', ')}`);

      // Step 2: Select appropriate plugins
      const languagePlugin = this.pluginRegistry.getLanguagePluginByExtension(target);
      if (!languagePlugin) {
        throw new Error(
          `Unsupported file type: ${path.extname(target)}. Supported: ${this.pluginRegistry
            .getAllLanguagePlugins()
            .map((p) => p.extensions.join(', '))
            .join('; ')}`
        );
      }

      const frameworkPlugin = await this.pluginRegistry.getFrameworkPlugin('auto');
      this.logger.info(
        `[Agent] Using language plugin: ${languagePlugin.name}, framework: ${frameworkPlugin?.name || 'none'}`
      );

      // Step 3: Read and parse target
      const targetFile = await this.readFile(target, languagePlugin);
      this.emit('file-read', { path: target, size: targetFile.content.length });
      this.logger.info(`[Agent] Read target file: ${targetFile.content.length} characters`);

      // Step 4: Discover dependencies (parallel, cached)
      const maxDepth = options?.maxDependencyDepth || 2;
      const dependencies = await this.discoverDependencies(
        targetFile,
        languagePlugin,
        projectInfo,
        maxDepth
      );
      this.emit('dependencies-found', { count: dependencies.length });
      this.logger.info(`[Agent] Found ${dependencies.length} dependencies`);

      // Step 5: Analyze code structure, run security scan, and SAST analysis in parallel
      const [analysis, securityScan, sastResult] = await Promise.all([
        this.analyzeCode(targetFile, languagePlugin),
        this.runSecurityScan(this.projectRoot, options),
        this.runSASTAnalysis(targetFile, options),
      ]);
      this.emit('analysis-complete', analysis);
      this.emit('security-scan-complete', securityScan);
      this.emit('sast-analysis-complete', sastResult);
      this.logger.info(`[Agent] Analysis complete: complexity=${analysis.complexity.cyclomatic}`);
      if (securityScan) {
        this.logger.info(
          `[Agent] Security scan complete: ${securityScan.summary.critical} critical, ` +
          `${securityScan.summary.high} high vulnerabilities`
        );
      }
      if (sastResult) {
        this.logger.info(
          `[Agent] SAST analysis complete: ${sastResult.summary.critical} critical, ` +
          `${sastResult.summary.high} high findings`
        );
      }

      // Step 6: Check if file needs chunking (large files)
      const needsChunking = this.largeCodebaseHandler.shouldChunk(targetFile);
      
      // Step 7: Understand with LLM (cost-aware, cached, chunked if needed)
      const understanding = needsChunking
        ? await this.understandLargeCode(targetFile, dependencies, frameworkPlugin, options?.costLimit)
        : await this.understandCode(
            targetFile,
            dependencies,
            frameworkPlugin,
            options?.costLimit
          );
      this.emit('understanding-complete', { confidence: understanding.confidence });
      this.logger.info(`[Agent] Understanding complete: confidence=${understanding.confidence}`);

      // Step 7: Generate test scenarios
      const scenarios = understanding.testScenarios || [];
      this.emit('scenarios-generated', { count: scenarios.length });
      this.logger.info(`[Agent] Generated ${scenarios.length} test scenarios`);

      // Step 8: Build comprehensive package
      const qaPackage = this.buildPackage(
        targetFile,
        dependencies,
        analysis,
        understanding,
        projectInfo,
        frameworkPlugin?.name || 'unknown',
        Date.now() - startTime,
        securityScan,
        sastResult
      );

      // Step 9: Evaluate quality gates
      const qualityGateResult = this.qualityGate.evaluate(qaPackage);
      qaPackage.qualityGate = qualityGateResult;
      this.emit('quality-gate-evaluated', qualityGateResult);
      this.logger.info(
        `[Agent] Quality gate: ${qualityGateResult.passed ? 'PASSED' : 'FAILED'} ` +
        `(${qualityGateResult.summary.passed}/${qualityGateResult.summary.total} rules passed)`
      );

      // Step 10: Generate auto-fix suggestions
      try {
        const fixes = await this.autoFixEngine.generateFixes(qaPackage);
        qaPackage.fixes = fixes;
        this.emit('fixes-generated', { count: fixes.length });
        this.logger.info(`[Agent] Generated ${fixes.length} fix suggestions`);
      } catch (error) {
        this.logger.warn('[Agent] Auto-fix generation failed:', error);
        qaPackage.fixes = [];
      }

      this.logger.info(
        `[Agent] Complete. Duration: ${qaPackage.metadata?.duration}ms, Cost: $${qaPackage.metadata?.cost?.toFixed(4)}`
      );
      this.emit('complete', {
        duration: qaPackage.metadata?.duration,
        cost: qaPackage.metadata?.cost,
      });

      return qaPackage;
    } catch (error) {
      this.emit('error', error);
      this.logger.error('Process failed', error as Error);
      throw this.wrapError(error as Error, target);
    }
  }

  /**
   * Generate actual test code from package
   */
  async generateTests(
    qaPackage: QAInputPackage,
    options?: TestGenerationOptions
  ): Promise<GeneratedTests> {
    this.logger.info('[Agent] Generating test code...');

    const frameworkName = options?.framework || qaPackage.projectInfo?.testFramework || 'auto';
    const frameworkPlugin = await this.pluginRegistry.getFrameworkPlugin(frameworkName);

    if (!frameworkPlugin) {
      throw new Error(`Test framework not supported: ${frameworkName}`);
    }

    // Use LLM to generate test code
    const testCode = await this.llmService.generateTestCode(
      qaPackage,
      frameworkPlugin,
      options
    );

    // Format and validate
    return frameworkPlugin.formatTests(testCode, qaPackage);
  }

  private async detectProject(target: string): Promise<any> {
    return await this.projectDetector.detect(target);
  }

  private async readFile(
    path: string,
    plugin: LanguagePlugin
  ): Promise<ParsedFile> {
    // Check cache first
    const cached = await this.cache.getParsedFile(path);
    if (cached) {
      return cached;
    }

    const file = await plugin.parseFile(path);
    await this.cache.setParsedFile(path, file);
    return file;
  }

  private async discoverDependencies(
    file: ParsedFile,
    plugin: LanguagePlugin,
    projectInfo: any,
    maxDepth: number
  ): Promise<ParsedFile[]> {
    return await this.dependencyDiscoverer.discoverDependencies(
      file,
      plugin,
      this.projectRoot,
      maxDepth
    );
  }

  private async analyzeCode(
    file: ParsedFile,
    plugin: LanguagePlugin
  ): Promise<CodeAnalysis> {
    return this.codeAnalyzer.analyze(file);
  }

  private async runSecurityScan(
    projectRoot: string,
    options?: ProcessOptions
  ): Promise<any> {
    try {
      // Check if security scanning is enabled (can be configured later)
      const enabled = process.env.QA_MONSTER_SECURITY_ENABLED !== 'false';
      if (!enabled) {
        return undefined;
      }

      this.logger.info('[Agent] Running security scan (SCA)...');
      const result = await this.securityScanner.scan(projectRoot, {
        cacheResults: true,
      });
      return result;
    } catch (error) {
      this.logger.warn('[Agent] Security scan failed, continuing without security data:', error);
      return undefined;
    }
  }

  private async runSASTAnalysis(
    targetFile: ParsedFile,
    options?: ProcessOptions
  ): Promise<any> {
    try {
      // Check if SAST is enabled
      const enabled = process.env.QA_MONSTER_SAST_ENABLED !== 'false';
      if (!enabled) {
        return undefined;
      }

      this.logger.info('[Agent] Running SAST analysis...');
      const result = this.sastAnalyzer.analyze(targetFile);
      return result;
    } catch (error) {
      this.logger.warn('[Agent] SAST analysis failed, continuing without SAST data:', error);
      return undefined;
    }
  }

  private async understandCode(
    target: ParsedFile,
    dependencies: ParsedFile[],
    framework: TestFrameworkPlugin | null,
    costLimit?: number
  ): Promise<Understanding> {
    // Build context efficiently
    const context = this.buildLLMContext(target, dependencies);

    // Check LLM cache
    const cacheKey = this.hashContext(context);
    const cached = await this.cache.getLLMResponse(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Call LLM with retry
    const understanding = await this.llmService.understandCode(
      context,
      framework,
      costLimit
    );

    // Cache result
    await this.cache.setLLMResponse(cacheKey, JSON.stringify(understanding));

    return understanding;
  }

  private async understandLargeCode(
    target: ParsedFile,
    dependencies: ParsedFile[],
    framework: TestFrameworkPlugin | null,
    costLimit?: number
  ): Promise<Understanding> {
    this.logger.info('[Agent] Large file detected, using chunking strategy...');
    
    // Chunk the file
    const chunks = this.largeCodebaseHandler.chunkFile(target);
    this.logger.info(`[Agent] Chunked file into ${chunks.length} pieces`);

    // Analyze structure first (without full content)
    const structureContext = {
      target: {
        path: target.path,
        code: '// File too large, analyzing structure only',
        functions: target.functions?.map(f => ({
          name: f.name,
          parameters: f.parameters,
          returnType: f.returnType,
          lineStart: f.lineStart,
          lineEnd: f.lineEnd,
        })),
        classes: target.classes?.map(c => ({
          name: c.name,
          methods: c.methods.length,
          properties: c.properties.length,
        })),
        totalLines: target.content.split('\n').length,
        chunkCount: chunks.length,
      },
      chunks: chunks.slice(0, 3).map(chunk => ({
        type: chunk.type,
        name: chunk.name,
        lines: `${chunk.startLine}-${chunk.endLine}`,
        preview: chunk.content.substring(0, 500),
      })),
    };

    // Use LLM with structure-only context
    const cacheKey = this.hashContext(structureContext);
    const cached = await this.cache.getLLMResponse(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const understanding = await this.llmService.understandCode(
      structureContext,
      framework,
      costLimit
    );

    await this.cache.setLLMResponse(cacheKey, JSON.stringify(understanding));
    return understanding;
  }

  private buildLLMContext(target: ParsedFile, dependencies: ParsedFile[]): any {
    // Smart context building - only include relevant parts
    const relevantDeps = this.selectRelevantDependencies(target, dependencies);

    // Calculate max code size based on file size
    const fileSize = target.content.length;
    const maxCodeSize = fileSize > 50000 ? 1000 : fileSize > 20000 ? 2000 : 3000;

    return {
      target: {
        path: target.path,
        code: this.truncateCode(target.content, maxCodeSize), // Adaptive limit
        functions: target.functions?.slice(0, 15), // More functions for larger files
        types: target.types?.slice(0, 5),
      },
      dependencies: relevantDeps.slice(0, 3).map((dep) => ({
        path: dep.path,
        code: this.truncateCode(dep.content, 300), // Reduced for large files
        exports: dep.exports?.slice(0, 5),
      })),
    };
  }

  private selectRelevantDependencies(
    target: ParsedFile,
    dependencies: ParsedFile[]
  ): ParsedFile[] {
    // Only include dependencies that are actually used
    const usedImports = new Set(target.imports?.map((i) => i.from) || []);

    return dependencies.filter((dep) => {
      // Check if this file exports something that target imports
      const depExports = dep.exports?.map((e) => e.name) || [];
      return depExports.some((exp) => usedImports.has(exp));
    });
  }

  private truncateCode(code: string, maxLines: number): string {
    const lines = code.split('\n');
    if (lines.length <= maxLines) return code;

    return (
      lines.slice(0, maxLines / 2).join('\n') +
      '\n// ... (truncated) ...\n' +
      lines.slice(-maxLines / 2).join('\n')
    );
  }

  private hashContext(context: any): string {
    // Simple hash based on target path and code hash
    const targetCode = context.target?.code || '';
    const codeHash = targetCode.length.toString();
    return `${context.target?.path || ''}_${codeHash}`;
  }

  private buildPackage(
    targetFile: ParsedFile,
    dependencies: ParsedFile[],
    analysis: CodeAnalysis,
    understanding: Understanding,
    projectInfo: any,
    testFramework: string,
    duration: number,
    securityScan?: any,
    sastResult?: any
  ): QAInputPackage {
    const confidence = this.calculateConfidence(understanding, {
      target: targetFile,
      dependencies,
      relatedFiles: [],
      testFiles: [],
      configFiles: [],
    });

    return {
      understanding: {
        target: {
          file: targetFile.path,
          purpose: understanding.purpose,
          mainFunctions: understanding.mainFunctions,
          complexity: understanding.complexity,
        },
        confidence: understanding.confidence,
        completeness: this.calculateCompleteness(dependencies),
      },
      codeContext: {
        targetFile,
        dependencies,
        relatedFiles: [],
        testFiles: [],
        configFiles: [],
      },
      insights: {
        complexity: analysis.complexity,
        patterns: analysis.patterns,
        edgeCases: understanding.edgeCases,
        risks: understanding.errorConditions,
        testability: analysis.testability,
      },
      recommendations: {
        testTypes: this.recommendTestTypes(understanding, analysis),
        priorities: this.recommendPriorities(understanding),
        strategies: this.recommendStrategies(analysis.patterns),
        focusAreas: understanding.edgeCases,
      },
      uncertainties: this.identifyUncertainties(understanding),
      confidence: {
        overall: confidence.overall,
        byAspect: confidence.byAspect,
      },
      metadata: {
        duration,
        cost: this.llmService.getTotalCost(),
        filesRead: dependencies.length + 1,
      },
      projectInfo: {
        language: projectInfo.languages[0] || 'unknown',
        testFramework,
        structure: projectInfo.type || 'single',
      },
      security: securityScan || sastResult ? {
        sca: securityScan,
        sast: sastResult,
      } : undefined,
    };
  }

  private calculateConfidence(
    understanding: Understanding,
    context: CodeContext
  ): { overall: number; byAspect: any } {
    const structure = context.dependencies.length > 0 ? 0.9 : 0.6;
    const logic = understanding.confidence;
    const dependencies = context.dependencies.length > 0 ? 0.8 : 0.5;
    const edgeCases = understanding.edgeCases.length > 0 ? 0.7 : 0.4;
    const errorHandling = understanding.errorConditions.length > 0 ? 0.8 : 0.5;

    const overall = (structure + logic + dependencies + edgeCases + errorHandling) / 5;

    return {
      overall,
      byAspect: {
        structure,
        logic,
        dependencies,
        edgeCases,
        errorHandling,
      },
    };
  }

  private calculateCompleteness(dependencies: ParsedFile[]): number {
    let score = 0.5; // Base score

    if (dependencies.length > 0) score += 0.2;
    if (dependencies.length > 5) score += 0.1;
    if (dependencies.length > 10) score += 0.2;

    return Math.min(1, score);
  }

  private recommendTestTypes(
    understanding: Understanding,
    analysis: CodeAnalysis
  ): string[] {
    const types: string[] = ['unit'];

    if (analysis.complexity.cyclomatic > 10) types.push('comprehensive');
    if (understanding.testScenarios.some((s) => s.type === 'integration')) {
      types.push('integration');
    }
    if (understanding.testScenarios.some((s) => s.type === 'e2e')) {
      types.push('e2e');
    }

    return types;
  }

  private recommendPriorities(understanding: Understanding): string[] {
    return understanding.testScenarios
      .filter((s) => s.priority === 'critical' || s.priority === 'high')
      .map((s) => s.name);
  }

  private recommendStrategies(patterns: string[]): string[] {
    const strategies: string[] = [];

    if (patterns.includes('async-await')) strategies.push('async-testing');
    if (patterns.includes('error-handling')) strategies.push('error-path-coverage');
    if (patterns.includes('null-checking')) strategies.push('boundary-value-analysis');

    return strategies;
  }

  private identifyUncertainties(understanding: Understanding): string[] {
    const uncertainties: string[] = [];

    if (understanding.edgeCases.length === 0) {
      uncertainties.push('Edge cases may not be fully identified');
    }

    if (understanding.confidence < 0.7) {
      uncertainties.push('Code understanding confidence is low');
    }

    return uncertainties;
  }

  private wrapError(error: Error, context: string): Error {
    // Developer-friendly error messages
    if (error.message.includes('ENOENT')) {
      return new Error(`File not found: ${context}. Check the path and try again.`);
    }
    if (error.message.includes('cost limit')) {
      return new Error(
        `Cost limit exceeded. Try reducing dependency depth or using a cheaper model.`
      );
    }
    return error;
  }

  private async registerBuiltInPlugins(tsConfigPath?: string): Promise<void> {
    // TypeScript / JavaScript
    const { TypeScriptPlugin } = await import('../plugins/languages/TypeScriptPlugin.js');
    const tsPlugin = new TypeScriptPlugin(tsConfigPath);
    this.pluginRegistry.registerLanguage(tsPlugin);

    // Python (enterprise)
    const { PythonPlugin } = await import('../plugins/languages/PythonPlugin.js');
    const pythonPlugin = new PythonPlugin(process.env.PYTHON_PATH || 'python3');
    this.pluginRegistry.registerLanguage(pythonPlugin);

    // Test frameworks
    const { JestPlugin } = await import('../plugins/frameworks/JestPlugin.js');
    this.pluginRegistry.registerFramework(new JestPlugin());

    const { VitestPlugin } = await import('../plugins/frameworks/VitestPlugin.js');
    this.pluginRegistry.registerFramework(new VitestPlugin());

    const { PytestPlugin } = await import('../plugins/frameworks/PytestPlugin.js');
    this.pluginRegistry.registerFramework(new PytestPlugin());
  }
}
