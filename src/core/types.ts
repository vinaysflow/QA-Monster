/**
 * Core types for the QA Monster Agent
 */

import {
  ParsedFile,
  FunctionInfo,
  Dependency,
} from '../plugins/interfaces.js';
import { SecurityScanResult } from '../security/types.js';
import { SASTResult } from '../security/sast/types.js';
import type { QualityGateResult } from '../quality/QualityGate.js';
import type { FixSuggestion } from '../fixes/types.js';
import type { CoverageReport, CoverageGap } from '../coverage/types.js';

export interface CodeAnalysis {
  complexity: ComplexityMetrics;
  patterns: string[];
  testability: 'high' | 'medium' | 'low';
  risks: string[];
  insights: string[];
}

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  linesOfCode: number;
  functionCount: number;
  dependencyCount: number;
}

export interface Understanding {
  purpose: string;
  mainFunctions: FunctionInfo[];
  complexity: ComplexityMetrics;
  edgeCases: string[];
  errorConditions: string[];
  testScenarios: TestScenario[];
  confidence: number;
}

export interface TestScenario {
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e';
  priority: 'critical' | 'high' | 'medium' | 'low';
  testSteps: string[];
  expectedResult: string;
}

export interface CodeContext {
  target: ParsedFile;
  dependencies: ParsedFile[];
  relatedFiles: ParsedFile[];
  testFiles: ParsedFile[];
  configFiles: ParsedFile[];
}

export interface QAInputPackage {
  understanding: {
    target: {
      file: string;
      purpose: string;
      mainFunctions: FunctionInfo[];
      complexity: ComplexityMetrics;
    };
    confidence: number;
    completeness: number;
  };
  codeContext: {
    targetFile: ParsedFile;
    dependencies: ParsedFile[];
    relatedFiles: ParsedFile[];
    testFiles: ParsedFile[];
    configFiles: ParsedFile[];
  };
  insights: {
    complexity: ComplexityMetrics;
    patterns: string[];
    edgeCases: string[];
    risks: string[];
    testability: 'high' | 'medium' | 'low';
  };
  recommendations: {
    testTypes: string[];
    priorities: string[];
    strategies: string[];
    focusAreas: string[];
  };
  uncertainties: string[];
  confidence: {
    overall: number;
    byAspect: {
      structure: number;
      logic: number;
      dependencies: number;
      edgeCases: number;
      errorHandling: number;
    };
  };
  metadata?: {
    duration: number;
    cost: number;
    filesRead: number;
  };
  projectInfo?: {
    language: string;
    testFramework: string;
    structure: string;
  };
  security?: {
    sca?: SecurityScanResult; // Software Composition Analysis (dependency vulnerabilities)
    sast?: SASTResult; // Static Application Security Testing (code-level vulnerabilities)
  };
  qualityGate?: QualityGateResult;
  fixes?: FixSuggestion[];
  coverage?: {
    report?: CoverageReport;
    gaps?: CoverageGap[];
  };
}

export interface ProcessOptions {
  maxDependencyDepth?: number;
  includeTransitive?: boolean;
  costLimit?: number;
  verbose?: boolean;
}

export interface TestGenerationOptions {
  framework?: string;
  outputDir?: string;
  includeImports?: boolean;
}

export interface GeneratedTests {
  code: string;
  filePath: string;
  framework: string;
  testCount: number;
}

export interface ProjectInfo {
  type: 'monorepo' | 'single' | 'multi';
  languages: string[];
  frameworks: string[];
  testFrameworks: string[];
  root: string;
}
