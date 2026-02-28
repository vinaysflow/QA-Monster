import { QAInputPackage } from '../core/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class OutputFormatter {
  constructor(private outputDir: string, private formats: string[]) {}

  async format(qaPackage: QAInputPackage): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });

    for (const format of this.formats) {
      switch (format) {
        case 'json':
          await this.formatJSON(qaPackage);
          break;
        case 'markdown':
          await this.formatMarkdown(qaPackage);
          break;
        case 'code':
          // Code formatting is handled separately
          break;
      }
    }
  }

  private async formatJSON(qaPackage: QAInputPackage): Promise<void> {
    const filePath = path.join(this.outputDir, 'qa-output.json');
    await fs.writeFile(filePath, JSON.stringify(qaPackage, null, 2), 'utf-8');
    console.log(`✅ JSON output written to ${filePath}`);
  }

  private async formatMarkdown(qaPackage: QAInputPackage): Promise<void> {
    const md = this.generateMarkdown(qaPackage);
    const filePath = path.join(this.outputDir, 'qa-output.md');
    await fs.writeFile(filePath, md, 'utf-8');
    console.log(`✅ Markdown output written to ${filePath}`);
  }

  private generateMarkdown(qaPackage: QAInputPackage): string {
    return `# QA Input Package

## Understanding

**Target File:** ${qaPackage.understanding.target.file}
**Purpose:** ${qaPackage.understanding.target.purpose}
**Confidence:** ${(qaPackage.understanding.confidence * 100).toFixed(1)}%
**Completeness:** ${(qaPackage.understanding.completeness * 100).toFixed(1)}%

### Main Functions
${qaPackage.understanding.target.mainFunctions
  .map((f) => `- **${f.name}**: ${(f as any).description || 'No description'}`)
  .join('\n')}

### Complexity
- Cyclomatic: ${qaPackage.understanding.target.complexity.cyclomatic}
- Cognitive: ${qaPackage.understanding.target.complexity.cognitive}
- Lines of Code: ${qaPackage.understanding.target.complexity.linesOfCode}
- Functions: ${qaPackage.understanding.target.complexity.functionCount}

## Insights

### Edge Cases
${qaPackage.insights.edgeCases.map((ec) => `- ${ec}`).join('\n')}

### Risks
${qaPackage.insights.risks.map((r) => `- ${r}`).join('\n')}

### Patterns
${qaPackage.insights.patterns.map((p) => `- ${p}`).join('\n')}

## Recommendations

### Test Types
${qaPackage.recommendations.testTypes.map((t) => `- ${t}`).join('\n')}

### Priorities
${qaPackage.recommendations.priorities.map((p) => `- ${p}`).join('\n')}

### Strategies
${qaPackage.recommendations.strategies.map((s) => `- ${s}`).join('\n')}

## Uncertainties
${qaPackage.uncertainties.map((u) => `- ${u}`).join('\n')}

## Confidence Breakdown
- Overall: ${(qaPackage.confidence.overall * 100).toFixed(1)}%
- Structure: ${(qaPackage.confidence.byAspect.structure * 100).toFixed(1)}%
- Logic: ${(qaPackage.confidence.byAspect.logic * 100).toFixed(1)}%
- Dependencies: ${(qaPackage.confidence.byAspect.dependencies * 100).toFixed(1)}%
- Edge Cases: ${(qaPackage.confidence.byAspect.edgeCases * 100).toFixed(1)}%
- Error Handling: ${(qaPackage.confidence.byAspect.errorHandling * 100).toFixed(1)}%

${qaPackage.security ? `## Security Scan Results

${qaPackage.security.sca ? `### Dependency Vulnerabilities (SCA)

**Scanner:** ${qaPackage.security.sca.scanner}
**Scanned At:** ${qaPackage.security.sca.scannedAt}
**Packages Scanned:** ${qaPackage.security.sca.packagesScanned}
**Packages with Vulnerabilities:** ${qaPackage.security.sca.packagesWithVulnerabilities}

#### Vulnerability Summary
- Critical: ${qaPackage.security.sca.summary.critical}
- High: ${qaPackage.security.sca.summary.high}
- Medium: ${qaPackage.security.sca.summary.medium}
- Low: ${qaPackage.security.sca.summary.low}

#### Vulnerabilities
${qaPackage.security.sca.vulnerabilities.length > 0
  ? qaPackage.security.sca.vulnerabilities
      .map((v: any) => `- **${v.package}@${v.version}** (${v.severity}): ${v.description}${v.cve ? ` [CVE: ${v.cve}]` : ''}${v.fixVersion ? ` - Fix: ${v.fixVersion}` : ''}`)
      .join('\n')
  : 'No vulnerabilities found'}
` : ''}

${qaPackage.security.sast ? `### Code-Level Vulnerabilities (SAST)

**Scanned At:** ${qaPackage.security.sast.scannedAt}
**Files Scanned:** ${qaPackage.security.sast.filesScanned}

#### Finding Summary
- Critical: ${qaPackage.security.sast.summary.critical}
- High: ${qaPackage.security.sast.summary.high}
- Medium: ${qaPackage.security.sast.summary.medium}
- Low: ${qaPackage.security.sast.summary.low}

#### Security Findings
${qaPackage.security.sast.findings.length > 0
  ? qaPackage.security.sast.findings
      .map((f: any) => `- **${f.patternName}** (${f.severity}) at ${f.file}:${f.line}\n  ${f.message}\n  Recommendation: ${f.recommendation}${f.cwe ? ` [${f.cwe}]` : ''}`)
      .join('\n\n')
  : 'No security findings'}
` : ''}
` : ''}

${qaPackage.metadata ? `## Metadata
- Duration: ${qaPackage.metadata.duration}ms
- Cost: $${qaPackage.metadata.cost?.toFixed(4) || '0.0000'}
- Files Read: ${qaPackage.metadata.filesRead}
` : ''}
`;
  }
}
