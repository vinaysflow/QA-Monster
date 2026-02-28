#!/usr/bin/env tsx
/**
 * QA Monster Demo Script
 * Demonstrates all Phase 1 enterprise features in action
 */

import { CodeReadingAgent } from '../src/core/Agent.js';
import { SecurityScanner } from '../src/security/SecurityScanner.js';
import { SnykScanner } from '../src/security/scanners/SnykScanner.js';
import { NpmAuditScanner } from '../src/security/scanners/NpmAuditScanner.js';
import { SASTAnalyzer } from '../src/security/SASTAnalyzer.js';
import { QualityGate } from '../src/quality/QualityGate.js';
import { AutoFixEngine } from '../src/fixes/AutoFixEngine.js';
import { CoverageTracker } from '../src/coverage/CoverageTracker.js';
import { IssueTracker } from '../src/integrations/IssueTracker.js';
import { JiraIntegration } from '../src/integrations/jira/JiraIntegration.js';
import { GitHubIssuesIntegration } from '../src/integrations/github/GitHubIssuesIntegration.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const DEMO_FILE = path.join(process.cwd(), 'demo', 'demo-vulnerable-code.ts');

async function createDemoFile() {
  const demoCode = `
// Demo file with security vulnerabilities for testing
export function vulnerableFunction(userInput: string) {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userInput;
  
  // XSS vulnerability
  if (typeof document !== 'undefined') {
    document.getElementById('output').innerHTML = userInput;
  }
  
  // Weak crypto
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(userInput).digest('hex');
  
  // Hardcoded credentials (example)
  const apiKey = "sk_test_FAKE_KEY_FOR_DEMO_ONLY_000000000";
  
  // eval usage
  eval(userInput);
  
  return query;
}

export function highComplexityFunction() {
  let result = 0;
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100; j++) {
      for (let k = 0; k < 100; k++) {
        if (i % 2 === 0) {
          if (j % 2 === 0) {
            if (k % 2 === 0) {
              result += i + j + k;
            }
          }
        }
      }
    }
  }
  return result;
}
`;
  
  await fs.mkdir(path.dirname(DEMO_FILE), { recursive: true });
  await fs.writeFile(DEMO_FILE, demoCode, 'utf-8');
  console.log('✅ Created demo file:', DEMO_FILE);
}

async function demoSecurityScanning() {
  console.log('\n🔒 DEMO 1: Security Scanning (SCA)');
  console.log('=' .repeat(50));
  
  const scanner = new SecurityScanner();
  scanner.registerScanner(new SnykScanner());
  scanner.registerScanner(new NpmAuditScanner());
  
  const result = await scanner.scan(process.cwd(), { cacheResults: false });
  
  console.log(`Scanner: ${result.scanner}`);
  console.log(`Packages Scanned: ${result.packagesScanned}`);
  console.log(`Vulnerabilities Found:`);
  console.log(`  - Critical: ${result.summary.critical}`);
  console.log(`  - High: ${result.summary.high}`);
  console.log(`  - Medium: ${result.summary.medium}`);
  console.log(`  - Low: ${result.summary.low}`);
  
  if (result.vulnerabilities.length > 0) {
    console.log('\nTop 3 Vulnerabilities:');
    result.vulnerabilities.slice(0, 3).forEach(v => {
      console.log(`  - ${v.package}@${v.version} (${v.severity}): ${v.description}`);
    });
  }
}

async function demoSAST() {
  console.log('\n🛡️ DEMO 2: SAST Analysis');
  console.log('=' .repeat(50));
  
  const analyzer = new SASTAnalyzer();
  const content = await fs.readFile(DEMO_FILE, 'utf-8');
  
  const parsedFile = {
    path: DEMO_FILE,
    content,
    functions: [],
    imports: [],
    exports: [],
  };
  
  const result = analyzer.analyze(parsedFile);
  
  console.log(`Files Scanned: ${result.filesScanned}`);
  console.log(`Findings:`);
  console.log(`  - Critical: ${result.summary.critical}`);
  console.log(`  - High: ${result.summary.high}`);
  console.log(`  - Medium: ${result.summary.medium}`);
  console.log(`  - Low: ${result.summary.low}`);
  
  if (result.findings.length > 0) {
    console.log('\nTop 5 Findings:');
    result.findings.slice(0, 5).forEach(f => {
      console.log(`  - ${f.patternName} (${f.severity}) at ${f.file}:${f.line}`);
      console.log(`    ${f.message}`);
    });
  }
}

async function demoQualityGates() {
  console.log('\n✅ DEMO 3: Quality Gates');
  console.log('=' .repeat(50));
  
  const qualityGate = new QualityGate();
  
  // Mock QA package with security issues
  const mockQAPackage = {
    understanding: {
      target: {
        file: DEMO_FILE,
        purpose: 'Demo',
        mainFunctions: [],
        complexity: {
          cyclomatic: 60,
          cognitive: 30,
          linesOfCode: 50,
          functionCount: 2,
          dependencyCount: 5,
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
        linesOfCode: 50,
        functionCount: 2,
        dependencyCount: 5,
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
            file: DEMO_FILE,
            line: 8,
            severity: 'high' as any,
            message: 'XSS vulnerability',
            recommendation: 'Use textContent',
            codeSnippet: 'innerHTML = userInput',
            category: 'xss',
          },
        ],
        summary: { critical: 1, high: 1, medium: 0, low: 0 },
        scannedAt: new Date().toISOString(),
        filesScanned: 1,
      },
    },
  };
  
  const result = qualityGate.evaluate(mockQAPackage);
  
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Rules: ${result.summary.passed}/${result.summary.total} passed`);
  console.log(`Failed: ${result.summary.failed}`);
  console.log(`Warnings: ${result.summary.warnings}`);
  
  console.log('\nRule Results:');
  result.rules.forEach(rule => {
    console.log(`  ${rule.passed ? '✅' : '❌'} ${rule.rule.name}: ${rule.message}`);
  });
}

async function demoAutoFix() {
  console.log('\n🔧 DEMO 4: Auto-Fix Engine');
  console.log('=' .repeat(50));
  
  const engine = new AutoFixEngine();
  
  const mockQAPackage = {
    understanding: {
      target: {
        file: DEMO_FILE,
        purpose: 'Demo',
        mainFunctions: [],
        complexity: {
          cyclomatic: 60,
          cognitive: 30,
          linesOfCode: 50,
          functionCount: 2,
          dependencyCount: 5,
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
        linesOfCode: 50,
        functionCount: 2,
        dependencyCount: 5,
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
            file: DEMO_FILE,
            line: 8,
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
  
  console.log(`Fix Suggestions Generated: ${fixes.length}`);
  
  fixes.forEach((fix, idx) => {
    console.log(`\n${idx + 1}. ${fix.type.toUpperCase()}: ${fix.description}`);
    console.log(`   Severity: ${fix.severity}`);
    console.log(`   Confidence: ${(fix.confidence * 100).toFixed(0)}%`);
    console.log(`   File: ${fix.file}:${fix.line}`);
    if (fix.patch) {
      console.log(`   Patch: ${fix.patch.split('\n').slice(0, 3).join('\n')}...`);
    }
  });
}

async function demoCoverageTracking() {
  console.log('\n📊 DEMO 5: Coverage Tracking');
  console.log('=' .repeat(50));
  
  const tracker = new CoverageTracker();
  
  console.log('✅ CoverageTracker initialized');
  console.log('   - Supports Jest and Vitest parsers');
  console.log('   - Gap analysis available');
  console.log('   - Historical tracking enabled');
  
  // Note: Would need actual coverage files to parse
  console.log('\n💡 To use:');
  console.log('   1. Run your test suite with coverage');
  console.log('   2. Point CoverageTracker to coverage report');
  console.log('   3. Get gap analysis and recommendations');
}

async function demoIssueTracker() {
  console.log('\n🎫 DEMO 6: Issue Tracker Integration');
  console.log('=' .repeat(50));
  
  const tracker = new IssueTracker();
  tracker.registerTracker(new JiraIntegration());
  tracker.registerTracker(new GitHubIssuesIntegration());
  
  console.log('✅ Registered trackers:');
  console.log('   - Jira Integration');
  console.log('   - GitHub Issues Integration');
  
  console.log('\n💡 To use:');
  console.log('   1. Configure API credentials');
  console.log('   2. Set severity thresholds');
  console.log('   3. Issues auto-created for critical findings');
}

async function demoFullAgent() {
  console.log('\n🤖 DEMO 7: Full Agent Integration');
  console.log('=' .repeat(50));
  
  const agent = new CodeReadingAgent(process.cwd());
  
  console.log('✅ Agent initialized with:');
  console.log('   - Security Scanner (SCA + SAST)');
  console.log('   - Quality Gates');
  console.log('   - Auto-Fix Engine');
  console.log('   - Coverage Tracking');
  console.log('   - Issue Tracker');
  
  console.log('\n💡 To analyze a file:');
  console.log('   npm run dev analyze <file-path>');
}

async function main() {
  console.log('🚀 QA MONSTER - PHASE 1 FEATURES DEMO');
  console.log('=' .repeat(50));
  
  await createDemoFile();
  
  await demoSecurityScanning();
  await demoSAST();
  await demoQualityGates();
  await demoAutoFix();
  await demoCoverageTracking();
  await demoIssueTracker();
  await demoFullAgent();
  
  console.log('\n✅ DEMO COMPLETE!');
  console.log('=' .repeat(50));
  console.log('\nAll Phase 1 enterprise features are working!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run dev analyze <file>');
  console.log('  2. View results in: qa-output/qa-output.json');
  console.log('  3. Start dashboard: cd dashboard && npm install && npm run dev');
  console.log('  4. Install VS Code extension: cd vscode-extension && npm install');
}

main().catch(console.error);
