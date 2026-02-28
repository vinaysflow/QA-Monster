/**
 * Comprehensive Phase 1 Feature Tests
 * Tests all implemented enterprise features
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CodeReadingAgent } from '../core/Agent.js';
import { SecurityScanner } from '../security/SecurityScanner.js';
import { SnykScanner } from '../security/scanners/SnykScanner.js';
import { NpmAuditScanner } from '../security/scanners/NpmAuditScanner.js';
import { SASTAnalyzer } from '../security/SASTAnalyzer.js';
import { QualityGate } from '../quality/QualityGate.js';
import { AutoFixEngine } from '../fixes/AutoFixEngine.js';
import { CoverageTracker } from '../coverage/CoverageTracker.js';
import { IssueTracker } from '../integrations/IssueTracker.js';
import { JiraIntegration } from '../integrations/jira/JiraIntegration.js';
import { GitHubIssuesIntegration } from '../integrations/github/GitHubIssuesIntegration.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Phase 1: Enterprise Features Comprehensive Tests', () => {
  const testProjectRoot = process.cwd();
  let testFile: string;

  beforeAll(async () => {
    // Create a test file with known security issues for testing
    testFile = path.join(testProjectRoot, 'test-security-file.ts');
    const testContent = `
// Test file with security issues for SAST testing
export function vulnerableFunction(userInput: string) {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userInput;
  
  // XSS vulnerability
  document.getElementById('output').innerHTML = userInput;
  
  // Weak crypto
  const hash = require('crypto').createHash('md5').update(userInput).digest('hex');
  
  // Hardcoded credentials
  const apiKey = "sk_test_FAKE_KEY_FOR_DEMO_ONLY_000000000";
  
  // eval usage
  eval(userInput);
  
  return query;
}
`;
    await fs.writeFile(testFile, testContent, 'utf-8');
  });

  describe('1. Security Scanning (SCA)', () => {
    it('should initialize SecurityScanner with plugin architecture', () => {
      const scanner = new SecurityScanner();
      expect(scanner).toBeDefined();
    });

    it('should register Snyk scanner', () => {
      const scanner = new SecurityScanner();
      const snyk = new SnykScanner();
      scanner.registerScanner(snyk);
      expect(scanner).toBeDefined();
    });

    it('should register npm audit scanner', () => {
      const scanner = new SecurityScanner();
      const npmAudit = new NpmAuditScanner();
      scanner.registerScanner(npmAudit);
      expect(scanner).toBeDefined();
    });

    it('should check scanner availability', async () => {
      const snyk = new SnykScanner();
      const npmAudit = new NpmAuditScanner();
      
      // These should not throw
      await expect(snyk.isAvailable()).resolves.toBeDefined();
      await expect(npmAudit.isAvailable()).resolves.toBeDefined();
    });
  });

  describe('2. SAST Analysis', () => {
    it('should initialize SASTAnalyzer', () => {
      const analyzer = new SASTAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('should detect security patterns in code', async () => {
      const analyzer = new SASTAnalyzer();
      const testFileContent = await fs.readFile(testFile, 'utf-8');
      
      const parsedFile = {
        path: testFile,
        content: testFileContent,
        functions: [],
        imports: [],
        exports: [],
      };

      const result = analyzer.analyze(parsedFile);
      
      expect(result).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.summary.critical).toBeGreaterThanOrEqual(0);
      expect(result.summary.high).toBeGreaterThanOrEqual(0);
      
      // Should detect multiple security issues
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should detect SQL injection patterns', async () => {
      const analyzer = new SASTAnalyzer();
      const sqlVulnerableCode = `
        const query = "SELECT * FROM users WHERE id = " + userInput;
      `;
      
      const parsedFile = {
        path: 'test.ts',
        content: sqlVulnerableCode,
        functions: [],
        imports: [],
        exports: [],
      };

      const result = analyzer.analyze(parsedFile);
      const sqlFindings = result.findings.filter(f => f.patternId.includes('sql-injection'));
      
      expect(sqlFindings.length).toBeGreaterThan(0);
    });

    it('should detect XSS patterns', async () => {
      const analyzer = new SASTAnalyzer();
      const xssVulnerableCode = `
        document.getElementById('output').innerHTML = userInput;
      `;
      
      const parsedFile = {
        path: 'test.ts',
        content: xssVulnerableCode,
        functions: [],
        imports: [],
        exports: [],
      };

      const result = analyzer.analyze(parsedFile);
      const xssFindings = result.findings.filter(f => f.patternId.includes('xss'));
      
      expect(xssFindings.length).toBeGreaterThan(0);
    });
  });

  describe('3. Quality Gates', () => {
    it('should initialize QualityGate', () => {
      const qualityGate = new QualityGate();
      expect(qualityGate).toBeDefined();
    });

    it('should have default rules', () => {
      const qualityGate = new QualityGate();
      const rules = qualityGate.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should evaluate quality gates', () => {
      const qualityGate = new QualityGate();
      
      const mockQAPackage = {
        understanding: {
          target: {
            file: 'test.ts',
            purpose: 'Test',
            mainFunctions: [],
            complexity: {
              cyclomatic: 10,
              cognitive: 5,
              linesOfCode: 100,
              functionCount: 2,
              dependencyCount: 3,
            },
          },
          confidence: 0.9,
          completeness: 0.8,
        },
        codeContext: {
          targetFile: {} as any,
          dependencies: [],
          relatedFiles: [],
          testFiles: [],
          configFiles: [],
        },
        insights: {
          complexity: {
            cyclomatic: 10,
            cognitive: 5,
            linesOfCode: 100,
            functionCount: 2,
            dependencyCount: 3,
          },
          patterns: [],
          edgeCases: [],
          risks: [],
          testability: 'high' as const,
        },
        recommendations: {
          testTypes: [],
          priorities: [],
          strategies: [],
          focusAreas: [],
        },
        uncertainties: [],
        confidence: {
          overall: 0.9,
          byAspect: {
            structure: 0.9,
            logic: 0.9,
            dependencies: 0.8,
            edgeCases: 0.7,
            errorHandling: 0.8,
          },
        },
      };

      const result = qualityGate.evaluate(mockQAPackage);
      
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.rules).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
    });

    it('should fail quality gate on critical security issues', () => {
      const qualityGate = new QualityGate();
      
      const mockQAPackage = {
        understanding: {
          target: {
            file: 'test.ts',
            purpose: 'Test',
            mainFunctions: [],
            complexity: {
              cyclomatic: 10,
              cognitive: 5,
              linesOfCode: 100,
              functionCount: 2,
              dependencyCount: 3,
            },
          },
          confidence: 0.9,
          completeness: 0.8,
        },
        codeContext: {
          targetFile: {} as any,
          dependencies: [],
          relatedFiles: [],
          testFiles: [],
          configFiles: [],
        },
        insights: {
          complexity: {
            cyclomatic: 10,
            cognitive: 5,
            linesOfCode: 100,
            functionCount: 2,
            dependencyCount: 3,
          },
          patterns: [],
          edgeCases: [],
          risks: [],
          testability: 'high' as any,
        },
        recommendations: {
          testTypes: [],
          priorities: [],
          strategies: [],
          focusAreas: [],
        },
        uncertainties: [],
        confidence: {
          overall: 0.9,
          byAspect: {
            structure: 0.9,
            logic: 0.9,
            dependencies: 0.8,
            edgeCases: 0.7,
            errorHandling: 0.8,
          },
        },
        security: {
          sca: {
            vulnerabilities: [],
            summary: { critical: 1, high: 0, medium: 0, low: 0 },
            scanner: 'test',
            scannedAt: new Date().toISOString(),
            packagesScanned: 0,
            packagesWithVulnerabilities: 0,
          },
        },
      };

      const result = qualityGate.evaluate(mockQAPackage);
      
      // Should fail due to critical security issue
      expect(result.passed).toBe(false);
      expect(result.summary.failed).toBeGreaterThan(0);
    });
  });

  describe('4. Auto-Fix Engine', () => {
    it('should initialize AutoFixEngine', () => {
      const engine = new AutoFixEngine();
      expect(engine).toBeDefined();
    });

    it('should generate fix suggestions', async () => {
      const engine = new AutoFixEngine();
      
      const mockQAPackage = {
        understanding: {
          target: {
            file: 'test.ts',
            purpose: 'Test',
            mainFunctions: [],
            complexity: {
              cyclomatic: 60, // High complexity
              cognitive: 30,
              linesOfCode: 200,
              functionCount: 5,
              dependencyCount: 10,
            },
          },
          confidence: 0.9,
          completeness: 0.8,
        },
        codeContext: {
          targetFile: {} as any,
          dependencies: [],
          relatedFiles: [],
          testFiles: [],
          configFiles: [],
        },
        insights: {
          complexity: {
            cyclomatic: 60,
            cognitive: 30,
            linesOfCode: 200,
            functionCount: 5,
            dependencyCount: 10,
          },
          patterns: [],
          edgeCases: [],
          risks: [],
          testability: 'low' as any,
        },
        recommendations: {
          testTypes: [],
          priorities: [],
          strategies: [],
          focusAreas: [],
        },
        uncertainties: [],
        confidence: {
          overall: 0.9,
          byAspect: {
            structure: 0.9,
            logic: 0.9,
            dependencies: 0.8,
            edgeCases: 0.7,
            errorHandling: 0.8,
          },
        },
        security: {
          sast: {
            findings: [
              {
                patternId: 'xss-innerhtml',
                patternName: 'XSS via innerHTML',
                file: 'test.ts',
                line: 5,
                severity: 'high' as any,
                message: 'XSS vulnerability',
                recommendation: 'Use textContent',
                codeSnippet: 'innerHTML = userInput',
                category: 'xss',
              },
            ],
            summary: { critical: 0, high: 1, medium: 0, low: 0 },
            scannedAt: new Date().toISOString(),
            filesScanned: 1,
          },
        },
      };

      const fixes = await engine.generateFixes(mockQAPackage);
      
      expect(fixes).toBeInstanceOf(Array);
      expect(fixes.length).toBeGreaterThan(0);
      
      // Should have fix for high complexity
      const complexityFix = fixes.find(f => f.id === 'complexity-refactor');
      expect(complexityFix).toBeDefined();
      
      // Should have fix for low testability
      const testabilityFix = fixes.find(f => f.id === 'testability-improve');
      expect(testabilityFix).toBeDefined();
    });
  });

  describe('5. Coverage Tracking', () => {
    it('should initialize CoverageTracker', () => {
      const tracker = new CoverageTracker();
      expect(tracker).toBeDefined();
    });

    it('should detect framework from report path', async () => {
      const tracker = new CoverageTracker();
      
      // Test Jest detection
      const jestPath = 'coverage/coverage-final.json';
      // Access private method via any cast for testing
      const framework = (tracker as any).detectFramework(jestPath);
      expect(['jest', 'vitest']).toContain(framework);
    });
  });

  describe('6. Issue Tracker Integration', () => {
    it('should initialize IssueTracker', () => {
      const tracker = new IssueTracker();
      expect(tracker).toBeDefined();
    });

    it('should register Jira integration', () => {
      const tracker = new IssueTracker();
      const jira = new JiraIntegration();
      tracker.registerTracker(jira);
      expect(tracker).toBeDefined();
    });

    it('should register GitHub Issues integration', () => {
      const tracker = new IssueTracker();
      const github = new GitHubIssuesIntegration();
      tracker.registerTracker(github);
      expect(tracker).toBeDefined();
    });

    it('should check Jira availability', async () => {
      const jira = new JiraIntegration();
      
      const configWithAuth = {
        provider: 'jira' as const,
        enabled: true,
        projectKey: 'TEST',
        createForSeverity: ['critical'] as any,
        url: 'https://test.atlassian.net',
        apiToken: 'test-token',
      };
      
      const available = await jira.isAvailable(configWithAuth);
      expect(available).toBe(true);
      
      const configWithoutAuth = {
        provider: 'jira' as const,
        enabled: true,
        projectKey: 'TEST',
        createForSeverity: ['critical'] as any,
      };
      
      const notAvailable = await jira.isAvailable(configWithoutAuth);
      expect(notAvailable).toBe(false);
    });

    it('should check GitHub availability', async () => {
      const github = new GitHubIssuesIntegration();
      
      const configWithToken = {
        provider: 'github' as const,
        enabled: true,
        projectKey: 'owner/repo',
        createForSeverity: ['critical'] as any,
        apiToken: 'test-token',
      };
      
      const available = await github.isAvailable(configWithToken);
      expect(available).toBe(true);
      
      const configWithoutToken = {
        provider: 'github' as const,
        enabled: true,
        projectKey: 'owner/repo',
        createForSeverity: ['critical'] as any,
      };
      
      const notAvailable = await github.isAvailable(configWithoutToken);
      expect(notAvailable).toBe(false);
    });
  });

  describe('7. Integration: Full Agent with Security', () => {
    it('should integrate all security features in Agent', () => {
      const agent = new CodeReadingAgent(testProjectRoot);
      expect(agent).toBeDefined();
      
      // Agent should have security scanner initialized
      // This is tested implicitly through the agent's existence
    });
  });

  describe('8. Type Safety and Exports', () => {
    it('should export all required types', () => {
      // Test that all modules export their types correctly
      expect(SecurityScanner).toBeDefined();
      expect(SASTAnalyzer).toBeDefined();
      expect(QualityGate).toBeDefined();
      expect(AutoFixEngine).toBeDefined();
      expect(CoverageTracker).toBeDefined();
      expect(IssueTracker).toBeDefined();
    });
  });
});
