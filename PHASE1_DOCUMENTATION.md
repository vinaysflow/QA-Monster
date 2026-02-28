# QA Monster - Phase 1 Enterprise Features Documentation

## Overview

QA Monster is an enterprise-grade code analysis and test generation platform with comprehensive security scanning, quality gates, auto-fix capabilities, and CI/CD integration.

## ✅ Phase 1 Implementation Status: **COMPLETE** (22/22 features)

---

## 1. Security Scanning (SCA - Software Composition Analysis)

### Features
- **Multi-scanner support**: Plugin architecture supporting Snyk, npm audit, and extensible to other scanners
- **Dependency vulnerability detection**: Scans package.json, package-lock.json, and other manifest files
- **CVE tracking**: Identifies and reports CVEs with severity levels
- **Fix recommendations**: Suggests version updates to resolve vulnerabilities

### Usage

```typescript
import { SecurityScanner } from './src/security/SecurityScanner.js';
import { SnykScanner } from './src/security/scanners/SnykScanner.js';
import { NpmAuditScanner } from './src/security/scanners/NpmAuditScanner.js';

const scanner = new SecurityScanner();
scanner.registerScanner(new SnykScanner(process.env.SNYK_API_KEY));
scanner.registerScanner(new NpmAuditScanner());

const result = await scanner.scan(projectRoot);
console.log(`Found ${result.summary.critical} critical vulnerabilities`);
```

### Configuration

Set environment variables:
- `SNYK_API_KEY`: For Snyk scanning
- `QA_MONSTER_SECURITY_ENABLED`: Set to 'false' to disable (default: enabled)

### Output

Results are included in `QAInputPackage.security.sca`:
```json
{
  "security": {
    "sca": {
      "vulnerabilities": [...],
      "summary": {
        "critical": 0,
        "high": 2,
        "medium": 5,
        "low": 10
      },
      "scanner": "snyk, npm-audit",
      "scannedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 2. SAST (Static Application Security Testing)

### Features
- **Code-level vulnerability detection**: Analyzes source code for security patterns
- **Pattern library**: Detects SQL injection, XSS, weak crypto, hardcoded credentials, exposed secrets
- **CWE/OWASP mapping**: Maps findings to Common Weakness Enumeration and OWASP Top 10
- **Line-level precision**: Reports exact file and line numbers

### Detected Patterns

1. **SQL Injection**: String concatenation in SQL queries
2. **XSS (Cross-Site Scripting)**: innerHTML usage, eval() calls
3. **Weak Cryptography**: MD5, SHA-1 usage
4. **Hardcoded Credentials**: Passwords, API keys in source code
5. **Exposed Secrets**: Stripe keys, AWS keys, GitHub tokens, Slack tokens

### Usage

```typescript
import { SASTAnalyzer } from './src/security/SASTAnalyzer.js';

const analyzer = new SASTAnalyzer();
const result = analyzer.analyze(parsedFile);

result.findings.forEach(finding => {
  console.log(`${finding.patternName} at ${finding.file}:${finding.line}`);
  console.log(`Recommendation: ${finding.recommendation}`);
});
```

### Configuration

Set environment variable:
- `QA_MONSTER_SAST_ENABLED`: Set to 'false' to disable (default: enabled)

### Output

Results are included in `QAInputPackage.security.sast`:
```json
{
  "security": {
    "sast": {
      "findings": [
        {
          "patternId": "xss-innerhtml",
          "patternName": "XSS via innerHTML",
          "file": "src/app.ts",
          "line": 42,
          "severity": "high",
          "message": "innerHTML assignment may be vulnerable to XSS",
          "recommendation": "Use textContent or sanitize input",
          "cwe": "CWE-79",
          "owasp": "A03:2021 – Injection"
        }
      ],
      "summary": {
        "critical": 1,
        "high": 3,
        "medium": 2,
        "low": 1
      }
    }
  }
}
```

---

## 3. GitHub Actions Workflow

### Features
- **Automatic PR analysis**: Runs on pull request events
- **Incremental analysis**: Only analyzes changed files
- **PR comments**: Posts formatted analysis results as PR comments
- **Quality gate enforcement**: Fails build on critical security issues

### Setup

1. Copy `.github/workflows/qa-monster.yml` to your repository
2. Add secrets to GitHub:
   - `OPENAI_API_KEY`: For LLM analysis
   - `SNYK_API_KEY`: (Optional) For Snyk scanning

### Workflow Triggers

- `pull_request`: opened, synchronize, reopened
- `workflow_dispatch`: Manual trigger

### Output

The workflow:
1. Analyzes changed files
2. Posts PR comment with:
   - Security vulnerabilities (SCA + SAST)
   - Code metrics
   - Test recommendations
   - Quality gate status
3. Fails if critical vulnerabilities found (configurable)

---

## 4. Quality Gates

### Features
- **Configurable thresholds**: Set custom rules for security, complexity, coverage
- **Blocking merges**: Fail builds on rule violations
- **Multiple rule types**: Security, complexity, coverage, testability
- **Severity levels**: Error (blocks) or Warning (allows)

### Default Rules

1. **No Critical Security Vulnerabilities** (Error)
   - Blocks if any critical SCA or SAST findings

2. **Maximum Cyclomatic Complexity** (Warning)
   - Warns if complexity > 50

3. **No Critical SAST Findings** (Error)
   - Blocks if any critical SAST findings

### Usage

```typescript
import { QualityGate } from './src/quality/QualityGate.js';

const qualityGate = new QualityGate();
const result = qualityGate.evaluate(qaPackage);

if (!result.passed) {
  console.error(`Quality gate failed: ${result.summary.failed} rules failed`);
  process.exit(1);
}
```

### Custom Rules

```typescript
qualityGate.addRule({
  id: 'max-complexity-30',
  name: 'Maximum Complexity 30',
  metric: 'complexity',
  threshold: 30,
  operator: 'lte',
  severity: 'error',
  message: 'Complexity must not exceed 30',
});
```

### Output

Results are included in `QAInputPackage.qualityGate`:
```json
{
  "qualityGate": {
    "passed": false,
    "rules": [
      {
        "rule": {...},
        "passed": false,
        "actualValue": 1,
        "message": "❌ No Critical Security Vulnerabilities: Failed (1 == 0)"
      }
    ],
    "summary": {
      "total": 3,
      "passed": 2,
      "failed": 1,
      "warnings": 0
    }
  }
}
```

---

## 5. Auto-Fix Engine

### Features
- **Automatic fix generation**: Creates fix suggestions for security and quality issues
- **Multiple fix types**: Dependency updates, security code fixes, code quality refactoring
- **Patch generation**: Generates unified diff patches for review
- **Confidence scoring**: Each fix includes confidence level

### Fix Types

1. **Dependency Updates**: Updates vulnerable packages to safe versions
2. **Security Fixes**: Fixes SAST findings (e.g., replace innerHTML with textContent)
3. **Code Quality**: Refactoring suggestions for high complexity

### Usage

```typescript
import { AutoFixEngine } from './src/fixes/AutoFixEngine.js';

const engine = new AutoFixEngine();
const fixes = await engine.generateFixes(qaPackage);

fixes.forEach(fix => {
  console.log(`${fix.type}: ${fix.description}`);
  console.log(`Confidence: ${(fix.confidence * 100).toFixed(0)}%`);
  if (fix.patch) {
    console.log(`Patch:\n${fix.patch}`);
  }
});

// Apply a fix
const result = await engine.applyFix(fixes[0], projectRoot);
```

### Output

Results are included in `QAInputPackage.fixes`:
```json
{
  "fixes": [
    {
      "id": "security-fix-xss-innerhtml-8",
      "type": "security-fix",
      "severity": "high",
      "description": "innerHTML assignment may be vulnerable to XSS",
      "currentCode": "document.getElementById('output').innerHTML = userInput;",
      "suggestedCode": "document.getElementById('output').textContent = userInput;",
      "confidence": 0.7,
      "patch": "--- a/app.ts\n+++ b/app.ts\n@@ -8,1 +8,1 @@\n-document.getElementById('output').innerHTML = userInput;\n+document.getElementById('output').textContent = userInput;",
      "file": "src/app.ts",
      "line": 8,
      "explanation": "Use textContent or sanitize input before assigning to innerHTML"
    }
  ]
}
```

---

## 6. Coverage Tracking

### Features
- **Multi-framework support**: Jest and Vitest parsers (extensible)
- **Gap analysis**: Identifies uncovered code paths
- **Historical tracking**: Stores coverage data over time
- **Recommendations**: Suggests tests for uncovered areas

### Usage

```typescript
import { CoverageTracker } from './src/coverage/CoverageTracker.js';

const tracker = new CoverageTracker();

// Parse coverage report
const report = await tracker.parseCoverageReport('coverage/coverage-final.json', 'jest');

// Analyze gaps
const gaps = await tracker.analyzeGaps(report, sourceFiles);

// Store for historical tracking
await tracker.storeCoverageData(report.total);

// Get trends
const trends = await tracker.getTrends();
```

### Output

Results are included in `QAInputPackage.coverage`:
```json
{
  "coverage": {
    "report": {
      "total": {
        "lines": { "covered": 850, "total": 1000, "percentage": 85.0 },
        "statements": { "covered": 800, "total": 950, "percentage": 84.2 }
      },
      "files": [...],
      "framework": "jest"
    },
    "gaps": [
      {
        "file": "src/utils/helper.ts",
        "uncoveredLines": [42, 43, 44],
        "priority": "high",
        "recommendation": "Add unit tests for error handling paths"
      }
    ]
  }
}
```

---

## 7. Issue Tracker Integration

### Features
- **Multi-provider support**: Jira and GitHub Issues (extensible)
- **Automatic issue creation**: Creates tickets for critical findings
- **Configurable thresholds**: Set which severities trigger issue creation
- **Rich issue descriptions**: Includes code snippets, recommendations, CWE/OWASP mappings

### Supported Providers

1. **Jira**: Full REST API integration
2. **GitHub Issues**: Native GitHub API

### Usage

```typescript
import { IssueTracker } from './src/integrations/IssueTracker.js';
import { JiraIntegration } from './src/integrations/jira/JiraIntegration.js';
import { GitHubIssuesIntegration } from './src/integrations/github/GitHubIssuesIntegration.js';

const tracker = new IssueTracker();
tracker.registerTracker(new JiraIntegration());
tracker.registerTracker(new GitHubIssuesIntegration());

const config = {
  provider: 'jira',
  enabled: true,
  projectKey: 'PROJ',
  createForSeverity: ['critical', 'high'],
  url: 'https://yourcompany.atlassian.net',
  apiToken: process.env.JIRA_API_TOKEN,
};

const results = await tracker.createIssues(qaPackage, config);
```

### Configuration

**Jira:**
- `JIRA_URL`: Your Jira instance URL
- `JIRA_API_TOKEN`: API token
- `projectKey`: Jira project key

**GitHub:**
- `GITHUB_TOKEN`: Personal access token
- `projectKey`: Format: `owner/repo`

---

## 8. Dashboard

### Features
- **React-based UI**: Modern, responsive dashboard
- **Real-time visualization**: Charts for metrics and trends
- **Security dashboard**: Visual display of vulnerabilities
- **Coverage charts**: Pie and line charts for coverage
- **Quality gate status**: Visual pass/fail indicators

### Setup

```bash
cd dashboard
npm install
npm run dev
```

Access at: `http://localhost:3000`

### Components

1. **SecurityFindings**: Displays SCA and SAST vulnerabilities
2. **CodeMetrics**: Shows complexity metrics with charts
3. **QualityGates**: Quality gate status visualization
4. **CoverageCharts**: Coverage trends and gap analysis

---

## 9. VS Code Extension

### Features
- **Inline analysis**: Analyze current file from command palette
- **Sidebar view**: Tree view showing analysis results
- **Fix suggestions**: Apply fixes directly from extension
- **Context menu**: Right-click to analyze files

### Setup

```bash
cd vscode-extension
npm install
npm run compile
```

### Commands

- `QA Monster: Analyze Current File`: Analyzes the active file
- `QA Monster: Apply Suggested Fix`: Applies a fix suggestion

### Usage

1. Open a TypeScript/JavaScript file
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "QA Monster: Analyze Current File"
4. View results in the sidebar

---

## CLI Usage

### Analyze a file

```bash
npm run dev analyze src/app.ts
```

### Generate tests

```bash
npm run dev generate qa-output/qa-output.json
```

### Start API server

```bash
npm run dev serve
```

---

## API Endpoints

### POST /api/analyze

Analyze a file or directory.

**Request:**
```json
{
  "file": "src/app.ts",
  "options": {
    "maxDependencyDepth": 2,
    "costLimit": 10.0
  }
}
```

**Response:**
Returns `QAInputPackage` with all analysis results.

---

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Required for LLM analysis
- `SNYK_API_KEY`: Optional, for Snyk scanning
- `QA_MONSTER_SECURITY_ENABLED`: Enable/disable security scanning (default: true)
- `QA_MONSTER_SAST_ENABLED`: Enable/disable SAST (default: true)
- `QA_MONSTER_COST_LIMIT`: Maximum cost per analysis (default: 10.0)

### Config File

Create `qa-monster.config.json`:

```json
{
  "security": {
    "enabled": true,
    "scanners": ["snyk", "npm-audit"],
    "sast": {
      "enabled": true,
      "patterns": ["sql-injection", "xss", "crypto"]
    }
  },
  "qualityGates": {
    "enabled": true,
    "rules": [
      {
        "metric": "security",
        "threshold": 0,
        "operator": "eq",
        "severity": "error"
      }
    ]
  }
}
```

---

## Output Format

All analysis results are saved to `qa-output/qa-output.json` with the following structure:

```json
{
  "understanding": {...},
  "codeContext": {...},
  "insights": {...},
  "recommendations": {...},
  "security": {
    "sca": {...},
    "sast": {...}
  },
  "qualityGate": {...},
  "fixes": [...],
  "coverage": {...},
  "metadata": {
    "duration": 12345,
    "cost": 0.0023,
    "filesRead": 15
  }
}
```

---

## Best Practices

1. **Run analysis in CI/CD**: Integrate GitHub Actions workflow
2. **Set quality gates**: Configure thresholds appropriate for your project
3. **Review auto-fixes**: Always review suggested fixes before applying
4. **Track coverage**: Regularly analyze coverage gaps
5. **Monitor trends**: Use historical data to track improvements

---

## Troubleshooting

### Security scanning not working

- Check if `QA_MONSTER_SECURITY_ENABLED` is set
- Verify npm/Snyk CLI is available
- Check API keys are set correctly

### SAST not detecting issues

- Ensure `QA_MONSTER_SAST_ENABLED` is not 'false'
- Check file is being parsed correctly
- Verify patterns match your code

### Quality gate always fails

- Review quality gate rules
- Adjust thresholds if too strict
- Check actual values vs thresholds

---

## Next Steps (Phase 2)

Phase 2 will add:
- Cross-repository analysis
- SBOM generation
- License compliance
- RBAC & Multi-tenancy
- Audit logging
- Policy engine
- On-premise deployment
- Additional CI/CD integrations

---

## Support

For issues or questions, check:
- `TEST_RESULTS.md`: Test validation results
- `demo/demo-script.ts`: Example usage
- GitHub Issues: Report bugs or request features

---

**Last Updated**: 2024-01-01  
**Version**: 1.0.0  
**Phase 1 Status**: ✅ COMPLETE
