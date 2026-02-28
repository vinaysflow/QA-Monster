/**
 * Security Pattern Definitions
 * Defines patterns for detecting common security vulnerabilities
 */

import { SecurityPattern, SecurityFinding } from './types.js';
import { ParsedFile } from '../../plugins/interfaces.js';

/**
 * Get SQL Injection patterns
 */
export function getSQLInjectionPatterns(): SecurityPattern[] {
  return [
    {
      id: 'sql-injection-concatenation',
      name: 'SQL Injection via String Concatenation',
      severity: 'critical',
      description: 'Detects SQL queries built using string concatenation with user input',
      category: 'injection',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        // Pattern: SQL queries with + or template literals containing variables
        const sqlPatterns = [
          /SELECT\s+.*\s+FROM\s+.*\+.*['"]/i,
          /INSERT\s+INTO\s+.*\+.*['"]/i,
          /UPDATE\s+.*SET\s+.*\+.*['"]/i,
          /DELETE\s+FROM\s+.*\+.*['"]/i,
          /WHERE\s+.*\+.*['"]/i,
          /`SELECT\s+.*\$\{.*\}.*FROM/i,
          /`INSERT\s+.*\$\{.*\}.*INTO/i,
          /`UPDATE\s+.*\$\{.*\}.*SET/i,
          /`DELETE\s+.*\$\{.*\}.*FROM/i,
        ];

        lines.forEach((line: string, index: number) => {
          for (const pattern of sqlPatterns) {
            if (pattern.test(line)) {
              findings.push({
                patternId: 'sql-injection-concatenation',
                patternName: 'SQL Injection via String Concatenation',
                file: file.path,
                line: index + 1,
                severity: 'critical',
                message: 'SQL query uses string concatenation which may be vulnerable to SQL injection',
                recommendation: 'Use parameterized queries or prepared statements instead of string concatenation',
                codeSnippet: line.trim(),
                category: 'injection',
                cwe: 'CWE-89',
                owasp: 'A03:2021 – Injection',
              });
              break;
            }
          }
        });

        return findings;
      },
    },
  ];
}

/**
 * Get XSS patterns
 */
export function getXSSPatterns(): SecurityPattern[] {
  return [
    {
      id: 'xss-innerhtml',
      name: 'XSS via innerHTML',
      severity: 'high',
      description: 'Detects use of innerHTML with user-controlled data',
      category: 'xss',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        // Pattern: innerHTML assignment with variables
        const xssPatterns = [
          /\.innerHTML\s*=\s*[^'"]*\+/,
          /\.innerHTML\s*=\s*`[^`]*\$\{/,
          /\.innerHTML\s*=\s*[a-zA-Z_$][a-zA-Z0-9_$]*/,
        ];

        lines.forEach((line: string, index: number) => {
          // Skip if it's a comment or already sanitized
          if (line.trim().startsWith('//') || line.includes('sanitize') || line.includes('escape')) {
            return;
          }

          for (const pattern of xssPatterns) {
            if (pattern.test(line)) {
              findings.push({
                patternId: 'xss-innerhtml',
                patternName: 'XSS via innerHTML',
                file: file.path,
                line: index + 1,
                severity: 'high',
                message: 'innerHTML assignment may be vulnerable to XSS if user input is not sanitized',
                recommendation: 'Use textContent or sanitize input before assigning to innerHTML',
                codeSnippet: line.trim(),
                category: 'xss',
                cwe: 'CWE-79',
                owasp: 'A03:2021 – Injection',
              });
              break;
            }
          }
        });

        return findings;
      },
    },
    {
      id: 'xss-eval',
      name: 'XSS via eval()',
      severity: 'critical',
      description: 'Detects use of eval() which can execute arbitrary code',
      category: 'xss',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        lines.forEach((line: string, index: number) => {
          if (/\beval\s*\(/.test(line)) {
            findings.push({
              patternId: 'xss-eval',
              patternName: 'XSS via eval()',
              file: file.path,
              line: index + 1,
              severity: 'critical',
              message: 'eval() can execute arbitrary code and is a security risk',
              recommendation: 'Avoid eval(). Use JSON.parse() or other safe alternatives',
              codeSnippet: line.trim(),
              category: 'xss',
              cwe: 'CWE-95',
              owasp: 'A03:2021 – Injection',
            });
          }
        });

        return findings;
      },
    },
  ];
}

/**
 * Get insecure crypto patterns
 */
export function getCryptoPatterns(): SecurityPattern[] {
  return [
    {
      id: 'weak-crypto-md5',
      name: 'Weak Cryptographic Hash (MD5)',
      severity: 'high',
      description: 'Detects use of MD5 which is cryptographically broken',
      category: 'crypto',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        lines.forEach((line: string, index: number) => {
          if (/\bmd5\s*\(/i.test(line) || /crypto\.createHash\s*\(\s*['"]md5['"]/i.test(line)) {
            findings.push({
              patternId: 'weak-crypto-md5',
              patternName: 'Weak Cryptographic Hash (MD5)',
              file: file.path,
              line: index + 1,
              severity: 'high',
              message: 'MD5 is cryptographically broken and should not be used for security purposes',
              recommendation: 'Use SHA-256 or stronger hashing algorithms',
              codeSnippet: line.trim(),
              category: 'crypto',
              cwe: 'CWE-327',
              owasp: 'A02:2021 – Cryptographic Failures',
            });
          }
        });

        return findings;
      },
    },
    {
      id: 'weak-crypto-sha1',
      name: 'Weak Cryptographic Hash (SHA-1)',
      severity: 'medium',
      description: 'Detects use of SHA-1 which is deprecated',
      category: 'crypto',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        lines.forEach((line: string, index: number) => {
          if (/\bsha1\s*\(/i.test(line) || /crypto\.createHash\s*\(\s*['"]sha1['"]/i.test(line)) {
            findings.push({
              patternId: 'weak-crypto-sha1',
              patternName: 'Weak Cryptographic Hash (SHA-1)',
              file: file.path,
              line: index + 1,
              severity: 'medium',
              message: 'SHA-1 is deprecated and vulnerable to collision attacks',
              recommendation: 'Use SHA-256 or stronger hashing algorithms',
              codeSnippet: line.trim(),
              category: 'crypto',
              cwe: 'CWE-327',
              owasp: 'A02:2021 – Cryptographic Failures',
            });
          }
        });

        return findings;
      },
    },
  ];
}

/**
 * Get authentication patterns
 */
export function getAuthPatterns(): SecurityPattern[] {
  return [
    {
      id: 'hardcoded-credentials',
      name: 'Hardcoded Credentials',
      severity: 'critical',
      description: 'Detects hardcoded passwords, API keys, or tokens',
      category: 'auth',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        const credentialPatterns = [
          /password\s*[:=]\s*['"][^'"]{4,}['"]/i,
          /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
          /secret\s*[:=]\s*['"][^'"]{8,}['"]/i,
          /token\s*[:=]\s*['"][^'"]{8,}['"]/i,
          /apikey\s*[:=]\s*['"][^'"]{8,}['"]/i,
        ];

        lines.forEach((line: string, index: number) => {
          // Skip comments and test files
          if (line.trim().startsWith('//') || line.trim().startsWith('*') || 
              file.path.includes('.test.') || file.path.includes('.spec.')) {
            return;
          }

          for (const pattern of credentialPatterns) {
            if (pattern.test(line)) {
              findings.push({
                patternId: 'hardcoded-credentials',
                patternName: 'Hardcoded Credentials',
                file: file.path,
                line: index + 1,
                severity: 'critical',
                message: 'Hardcoded credentials detected in source code',
                recommendation: 'Move credentials to environment variables or secure secret management',
                codeSnippet: line.trim().substring(0, 100), // Truncate to avoid exposing full credential
                category: 'auth',
                cwe: 'CWE-798',
                owasp: 'A07:2021 – Identification and Authentication Failures',
              });
              break;
            }
          }
        });

        return findings;
      },
    },
  ];
}

/**
 * Get secrets detection patterns
 */
export function getSecretsPatterns(): SecurityPattern[] {
  return [
    {
      id: 'exposed-secrets',
      name: 'Exposed Secrets',
      severity: 'critical',
      description: 'Detects exposed API keys, tokens, and secrets',
      category: 'secrets',
      detector: (file: ParsedFile): SecurityFinding[] => {
        const findings: SecurityFinding[] = [];
        const content = file.content || '';
        const lines = content.split('\n');

        // Common secret patterns
        const secretPatterns = [
          {
            pattern: /sk_live_[a-zA-Z0-9]{24,}/,
            name: 'Stripe Live Key',
          },
          {
            pattern: /AKIA[0-9A-Z]{16}/,
            name: 'AWS Access Key',
          },
          {
            pattern: /ghp_[a-zA-Z0-9]{36}/,
            name: 'GitHub Personal Access Token',
          },
          {
            pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/,
            name: 'Slack Token',
          },
        ];

        lines.forEach((line: string, index: number) => {
          for (const { pattern, name } of secretPatterns) {
            if (pattern.test(line)) {
              findings.push({
                patternId: 'exposed-secrets',
                patternName: `Exposed ${name}`,
                file: file.path,
                line: index + 1,
                severity: 'critical',
                message: `Potential exposed ${name} detected`,
                recommendation: 'Immediately rotate the secret and remove it from source code. Use environment variables or secret management.',
                codeSnippet: line.trim().substring(0, 50) + '...', // Truncate to avoid exposing full secret
                category: 'secrets',
                cwe: 'CWE-798',
                owasp: 'A07:2021 – Identification and Authentication Failures',
              });
              break;
            }
          }
        });

        return findings;
      },
    },
  ];
}
