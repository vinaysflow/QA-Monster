import { TestFrameworkPlugin } from '../plugins/interfaces.js';

export function buildUnderstandingPrompt(
  context: any,
  framework: TestFrameworkPlugin | null
): string {
  const frameworkInfo = framework
    ? `\nTEST FRAMEWORK: ${framework.name}\n`
    : '';

  return `Analyze this code and provide comprehensive understanding for test generation.

TARGET CODE:
\`\`\`typescript
${context.target?.code || 'No code provided'}
\`\`\`

KEY FUNCTIONS:
${(context.target?.functions || [])
  .map((f: any) => `- ${f.name}(${f.parameters?.map((p: any) => p.name).join(', ') || ''})`)
  .join('\n')}

DEPENDENCIES (${context.dependencies?.length || 0}):
${(context.dependencies || [])
  .slice(0, 5)
  .map((d: any) => `- ${d.path}`)
  .join('\n')}
${frameworkInfo}
Provide JSON response with this structure:
{
  "purpose": "What does this code do?",
  "mainFunctions": [
    {
      "name": "function name",
      "description": "What it does",
      "parameters": ["param1", "param2"],
      "returns": "return type description"
    }
  ],
  "complexity": {
    "level": "low|medium|high",
    "reasons": ["reason1", "reason2"]
  },
  "edgeCases": [
    "Edge case 1: description",
    "Edge case 2: description"
  ],
  "errorConditions": [
    "Error condition 1: description",
    "Error condition 2: description"
  ],
  "testScenarios": [
    {
      "name": "Test scenario name",
      "description": "What to test",
      "type": "unit|integration|e2e",
      "priority": "critical|high|medium|low",
      "testSteps": ["step1", "step2"],
      "expectedResult": "expected outcome"
    }
  ],
  "confidence": 0.85
}

Focus on:
1. Understanding the business logic
2. Identifying all edge cases
3. Finding error conditions
4. Suggesting comprehensive test scenarios
5. Being specific and actionable`;
}

export function buildTestGenerationPrompt(
  qaPackage: any,
  framework: TestFrameworkPlugin
): string {
  const understanding = qaPackage.understanding || {};
  const scenarios = understanding.testScenarios || [];

  return `Generate comprehensive test cases based on this understanding.

UNDERSTANDING:
Purpose: ${understanding.target?.purpose || 'Unknown'}
Main Functions: ${(understanding.target?.mainFunctions || [])
  .map((f: any) => f.name)
  .join(', ')}

TEST SCENARIOS:
${scenarios
  .map(
    (s: any) => `
- ${s.name} (${s.type}, ${s.priority})
  Description: ${s.description}
  Steps: ${s.testSteps?.join(', ')}
  Expected: ${s.expectedResult}`
  )
  .join('\n')}

FRAMEWORK: ${framework.name}
ASSERTION SYNTAX:
${Object.entries(framework.getAssertionSyntax())
  .map(([key, value]) => `  ${key}: ${value}`)
  .join('\n')}

Generate test code in ${framework.name} format. Provide complete, runnable test code.
Include:
- Proper imports
- Test structure (describe/it blocks)
- Arrange-Act-Assert pattern
- All test scenarios
- Edge cases
- Error cases`;
}
