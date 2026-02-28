import { ParsedFile, FunctionInfo } from '../plugins/interfaces.js';
import { CodeAnalysis, ComplexityMetrics } from '../core/types.js';

/**
 * Code Analyzer - Calculates complexity, identifies patterns, assesses testability
 */
export class CodeAnalyzer {
  analyze(file: ParsedFile): CodeAnalysis {
    const complexity = this.analyzeComplexity(file);
    const patterns = this.identifyPatterns(file);
    const testability = this.assessTestability(complexity);
    const risks = this.identifyRisks(file);
    const insights = this.generateInsights(file, complexity, patterns);

    return {
      complexity,
      patterns,
      testability,
      risks,
      insights,
    };
  }

  analyzeComplexity(file: ParsedFile): ComplexityMetrics {
    const functions = file.functions || [];
    const linesOfCode = file.content.split('\n').length;

    // Calculate cyclomatic complexity (simplified)
    const cyclomatic = functions.reduce((sum, func) => {
      return sum + this.calculateFunctionComplexity(func, file.content);
    }, 0);

    return {
      cyclomatic,
      cognitive: cyclomatic * 1.2, // Simplified cognitive complexity
      linesOfCode,
      functionCount: functions.length,
      dependencyCount: file.imports?.length || 0,
    };
  }

  private calculateFunctionComplexity(func: FunctionInfo, content: string): number {
    // Extract function body
    const lines = content.split('\n');
    const funcLines = lines.slice(func.lineStart - 1, func.lineEnd);
    const funcBody = funcLines.join('\n');

    // Count decision points (simplified)
    const decisionPoints =
      (funcBody.match(/\bif\b/g) || []).length +
      (funcBody.match(/\belse\b/g) || []).length +
      (funcBody.match(/\bwhile\b/g) || []).length +
      (funcBody.match(/\bfor\b/g) || []).length +
      (funcBody.match(/\bswitch\b/g) || []).length +
      (funcBody.match(/\bcase\b/g) || []).length +
      (funcBody.match(/\bcatch\b/g) || []).length +
      (funcBody.match(/\?\s*:/g) || []).length;

    return Math.max(1, decisionPoints + 1); // At least 1
  }

  identifyPatterns(file: ParsedFile): string[] {
    const patterns: string[] = [];
    const content = file.content.toLowerCase();

    if (content.includes('async') && content.includes('await')) {
      patterns.push('async-await');
    }

    if (content.includes('class') && file.classes && file.classes.length > 0) {
      patterns.push('class-based');
    }

    if (content.includes('export const') || content.includes('export function')) {
      patterns.push('functional');
    }

    if (content.includes('try') && content.includes('catch')) {
      patterns.push('error-handling');
    }

    if (
      (content.includes('if') && content.includes('null')) ||
      content.includes('undefined')
    ) {
      patterns.push('null-checking');
    }

    if (content.includes('promise') || content.includes('then') || content.includes('catch')) {
      patterns.push('promise-based');
    }

    if (file.functions && file.functions.some((f) => f.isAsync)) {
      patterns.push('async-functions');
    }

    return patterns;
  }

  assessTestability(complexity: ComplexityMetrics): 'high' | 'medium' | 'low' {
    if (complexity.cyclomatic < 10 && complexity.functionCount < 5) return 'high';
    if (complexity.cyclomatic < 20 && complexity.functionCount < 10) return 'medium';
    return 'low';
  }

  identifyRisks(file: ParsedFile): string[] {
    const risks: string[] = [];

    // Check for error handling
    if (!file.content.includes('try') && !file.content.includes('catch')) {
      if (file.functions && file.functions.some((f) => f.isAsync)) {
        risks.push('Async functions without error handling');
      }
    }

    // Check for null checks
    if (file.functions) {
      const hasNullChecks = file.content.includes('null') || file.content.includes('undefined');
      if (!hasNullChecks && file.functions.length > 0) {
        risks.push('Potential null/undefined access without checks');
      }
    }

    // Check for high complexity
    const complexity = this.analyzeComplexity(file);
    if (complexity.cyclomatic > 20) {
      risks.push('High cyclomatic complexity - difficult to test');
    }

    return risks;
  }

  generateInsights(
    file: ParsedFile,
    complexity: ComplexityMetrics,
    patterns: string[]
  ): string[] {
    const insights: string[] = [];

    if (patterns.includes('async-await')) {
      insights.push('Uses async/await pattern - test with async test utilities');
    }

    if (patterns.includes('error-handling')) {
      insights.push('Has error handling - test error paths');
    }

    if (complexity.functionCount > 10) {
      insights.push('Multiple functions - consider unit testing each function');
    }

    if (file.classes && file.classes.length > 0) {
      insights.push('Class-based code - test class methods and state');
    }

    return insights;
  }
}
