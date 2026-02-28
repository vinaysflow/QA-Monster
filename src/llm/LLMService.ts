import OpenAI from 'openai';
import { Understanding, TestScenario } from '../core/types.js';
import { TestFrameworkPlugin } from '../plugins/interfaces.js';
import { buildUnderstandingPrompt, buildTestGenerationPrompt } from './prompts.js';

/**
 * LLM Service - Multi-provider, cost-aware, cached
 * 
 * Default: GPT-3.5-turbo for cost optimization
 */
export class LLMService {
  private client: OpenAI;
  private model: string;
  private totalCost: number = 0;
  private costLimit: number;

  constructor(apiKey?: string, model: string = 'gpt-3.5-turbo', costLimit: number = 10.0) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.costLimit = costLimit || parseFloat(process.env.QA_MONSTER_COST_LIMIT || '10.00');
  }

  async understandCode(
    context: any,
    framework: TestFrameworkPlugin | null,
    costLimit?: number
  ): Promise<Understanding> {
    const prompt = buildUnderstandingPrompt(context, framework);

    // Estimate cost
    const estimatedCost = this.estimateCost(prompt);
    const limit = costLimit || this.costLimit;
    
    if (this.totalCost + estimatedCost > limit) {
      throw new Error(
        `Cost limit exceeded. Current: $${this.totalCost.toFixed(4)}, Estimated: $${estimatedCost.toFixed(4)}, Limit: $${limit.toFixed(2)}`
      );
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert code analyzer. Provide detailed, accurate analysis in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      // Calculate actual cost
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const actualCost = this.calculateCost(inputTokens, outputTokens);
      this.totalCost += actualCost;

      const parsed = JSON.parse(content);
      return this.normalizeUnderstanding(parsed);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cost limit')) {
        throw error;
      }
      console.error('[LLM] Error understanding code:', error);
      return this.fallbackUnderstanding(context);
    }
  }

  async generateTestCode(
    qaPackage: any,
    framework: TestFrameworkPlugin,
    options?: any
  ): Promise<string> {
    const prompt = buildTestGenerationPrompt(qaPackage, framework);

    // Estimate cost
    const estimatedCost = this.estimateCost(prompt);
    if (this.totalCost + estimatedCost > this.costLimit) {
      throw new Error(`Cost limit exceeded. Estimated: $${estimatedCost.toFixed(4)}`);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert test writer. Generate comprehensive, runnable test code.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      });

      const content = response.choices[0].message.content || '';

      // Calculate actual cost
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const actualCost = this.calculateCost(inputTokens, outputTokens);
      this.totalCost += actualCost;

      return content;
    } catch (error) {
      console.error('[LLM] Error generating tests:', error);
      return '// Error generating tests';
    }
  }

  estimateCost(prompt: string): number {
    // Rough token estimation (4 chars = 1 token)
    const tokens = prompt.length / 4;
    
    // GPT-3.5-turbo pricing: $0.0005/1k input, $0.0015/1k output
    // Estimate 80% input, 20% output
    const inputCost = (tokens * 0.8) / 1000 * 0.0005;
    const outputCost = (tokens * 0.2) / 1000 * 0.0015;
    
    return inputCost + outputCost;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    // GPT-3.5-turbo pricing
    const inputCost = (inputTokens / 1000) * 0.0005;
    const outputCost = (outputTokens / 1000) * 0.0015;
    return inputCost + outputCost;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  resetCost(): void {
    this.totalCost = 0;
  }

  private normalizeUnderstanding(parsed: any): Understanding {
    return {
      purpose: parsed.purpose || 'Unknown',
      mainFunctions: parsed.mainFunctions || [],
      complexity: parsed.complexity || {
        cyclomatic: 0,
        cognitive: 0,
        linesOfCode: 0,
        functionCount: 0,
        dependencyCount: 0,
      },
      edgeCases: parsed.edgeCases || [],
      errorConditions: parsed.errorConditions || [],
      testScenarios: parsed.testScenarios || [],
      confidence: parsed.confidence || 0.5,
    };
  }

  private fallbackUnderstanding(context: any): Understanding {
    return {
      purpose: 'Could not analyze - LLM error',
      mainFunctions: [],
      complexity: {
        cyclomatic: 0,
        cognitive: 0,
        linesOfCode: 0,
        functionCount: 0,
        dependencyCount: 0,
      },
      edgeCases: [],
      errorConditions: [],
      testScenarios: [],
      confidence: 0.1,
    };
  }
}
