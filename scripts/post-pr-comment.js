#!/usr/bin/env node
/**
 * Post PR comment script
 * Formats and posts QA Monster analysis results as GitHub PR comments
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Format analysis results as markdown comment
 */
function formatComment(results) {
  let comment = '## 🔍 QA Monster Analysis Results\n\n';

  // Security findings
  if (results.security) {
    comment += '### 🔒 Security Analysis\n\n';

    if (results.security.sca) {
      const sca = results.security.sca;
      comment += `#### Dependency Vulnerabilities (SCA)\n`;
      comment += `- **Critical:** ${sca.summary.critical}\n`;
      comment += `- **High:** ${sca.summary.high}\n`;
      comment += `- **Medium:** ${sca.summary.medium}\n`;
      comment += `- **Low:** ${sca.summary.low}\n\n`;

      if (sca.vulnerabilities.length > 0) {
        comment += '<details><summary>View vulnerabilities</summary>\n\n';
        sca.vulnerabilities.slice(0, 20).forEach(v => {
          comment += `- **${v.package}@${v.version}** (${v.severity}): ${v.description}`;
          if (v.cve) comment += ` [CVE: ${v.cve}]`;
          if (v.fixVersion) comment += ` - Fix: ${v.fixVersion}`;
          comment += '\n';
        });
        if (sca.vulnerabilities.length > 20) {
          comment += `\n*... and ${sca.vulnerabilities.length - 20} more*\n`;
        }
        comment += '</details>\n\n';
      }
    }

    if (results.security.sast) {
      const sast = results.security.sast;
      comment += `#### Code-Level Vulnerabilities (SAST)\n`;
      comment += `- **Critical:** ${sast.summary.critical}\n`;
      comment += `- **High:** ${sast.summary.high}\n`;
      comment += `- **Medium:** ${sast.summary.medium}\n`;
      comment += `- **Low:** ${sast.summary.low}\n\n`;

      if (sast.findings.length > 0) {
        comment += '<details><summary>View findings</summary>\n\n';
        sast.findings.slice(0, 20).forEach(f => {
          comment += `- **${f.patternName}** (${f.severity}) at \`${f.file}:${f.line}\`\n`;
          comment += `  ${f.message}\n`;
          comment += `  💡 ${f.recommendation}`;
          if (f.cwe) comment += ` [${f.cwe}]`;
          comment += '\n\n';
        });
        if (sast.findings.length > 20) {
          comment += `*... and ${sast.findings.length - 20} more*\n`;
        }
        comment += '</details>\n\n';
      }
    }
  }

  // Code metrics
  comment += '### 📊 Code Metrics\n\n';
  const complexity = results.understanding.target.complexity;
  comment += `- **Cyclomatic Complexity:** ${complexity.cyclomatic}\n`;
  comment += `- **Cognitive Complexity:** ${complexity.cognitive}\n`;
  comment += `- **Lines of Code:** ${complexity.linesOfCode}\n`;
  comment += `- **Functions:** ${complexity.functionCount}\n\n`;

  // Test recommendations
  if (results.recommendations && results.recommendations.testTypes.length > 0) {
    comment += '### 🧪 Test Recommendations\n\n';
    comment += `**Test Types:** ${results.recommendations.testTypes.join(', ')}\n\n`;
    if (results.recommendations.priorities.length > 0) {
      comment += '**Priorities:**\n';
      results.recommendations.priorities.forEach(p => {
        comment += `- ${p}\n`;
      });
    }
  }

  // Quality gate status
  const hasCritical = (results.security?.sca?.summary.critical || 0) +
                     (results.security?.sast?.summary.critical || 0) > 0;
  const hasHigh = (results.security?.sca?.summary.high || 0) +
                 (results.security?.sast?.summary.high || 0) > 0;

  comment += '\n### ⚠️ Quality Gate\n\n';
  if (hasCritical) {
    comment += '❌ **Critical vulnerabilities detected** - Review required before merge\n';
  } else if (hasHigh) {
    comment += '⚠️ **High severity vulnerabilities detected** - Review recommended\n';
  } else {
    comment += '✅ No critical or high severity vulnerabilities detected\n';
  }

  return comment;
}

/**
 * Main function
 */
function main() {
  const resultsPath = process.argv[2] || join(process.cwd(), 'qa-output', 'qa-output.json');

  try {
    const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
    const comment = formatComment(results);
    console.log(comment);
  } catch (error) {
    console.error('Error formatting comment:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { formatComment };
