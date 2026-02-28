import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentConfig {
  project: {
    root: string;
    language?: string;
    testFramework?: string;
    structure?: 'monorepo' | 'single' | 'multi';
  };
  llm: {
    provider: 'openai' | 'anthropic' | 'local' | 'multi';
    model?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
    costLimit?: number;
    retry?: {
      maxAttempts: number;
      backoff: 'exponential' | 'linear';
    };
  };
  analysis: {
    dependencyDepth: number;
    includeTransitive: boolean;
    includeNodeModules: boolean;
    semanticSearch: boolean;
    maxFilesToRead: number;
  };
  testGeneration: {
    coverage: 'minimal' | 'standard' | 'comprehensive';
    includeEdgeCases: boolean;
    includeErrorCases: boolean;
    includePerformanceTests: boolean;
    includeSecurityTests: boolean;
    testTypes: ('unit' | 'integration' | 'e2e')[];
  };
  output: {
    format: ('json' | 'markdown' | 'code' | 'all')[];
    directory: string;
    fileName?: string;
    includeCodeContext: boolean;
    includeRecommendations: boolean;
  };
  performance: {
    maxConcurrentReads: number;
    enableCache: boolean;
    cacheTTL: number;
  };
  logging: {
    level: string;
    file: string | null;
  };
}

/**
 * Configuration Loader - Zero-config for common cases, powerful when needed
 */
export class ConfigLoader {
  async load(configPath?: string): Promise<AgentConfig> {
    // Try multiple locations
    const paths = [
      configPath,
      'qa-monster.config.json',
      'qa-monster.config.yaml',
      '.qa-monster.json',
    ].filter(Boolean) as string[];

    for (const configFile of paths) {
      if (await this.fileExists(configFile)) {
        return this.validateAndMerge(await this.parseConfig(configFile));
      }
    }

    // Check package.json for qaMonster field
    if (await this.fileExists('package.json')) {
      try {
        const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
        if (pkg.qaMonster) {
          return this.validateAndMerge(pkg.qaMonster);
        }
      } catch {
        // Ignore
      }
    }

    // Return smart defaults
    return this.getSmartDefaults();
  }

  private getSmartDefaults(): AgentConfig {
    const isCI = !!process.env.CI;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      project: {
        root: process.cwd(),
      },
      llm: {
        provider: process.env.OPENAI_API_KEY ? 'openai' : 'openai',
        model: isCI ? 'gpt-3.5-turbo' : 'gpt-3.5-turbo',
        temperature: 0.3,
        costLimit: parseFloat(process.env.QA_MONSTER_COST_LIMIT || '10.00'),
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
        },
      },
      analysis: {
        dependencyDepth: 2,
        includeTransitive: true,
        includeNodeModules: false,
        semanticSearch: !isCI,
        maxFilesToRead: 50,
      },
      testGeneration: {
        coverage: 'standard',
        includeEdgeCases: true,
        includeErrorCases: true,
        includePerformanceTests: false,
        includeSecurityTests: false,
        testTypes: ['unit', 'integration'],
      },
      performance: {
        maxConcurrentReads: 10,
        enableCache: true,
        cacheTTL: 24 * 60 * 60 * 1000,
      },
      output: {
        format: ['json', 'code'],
        directory: './qa-output',
        includeCodeContext: true,
        includeRecommendations: true,
      },
      logging: {
        level: isDevelopment ? 'debug' : 'info',
        file: isCI ? 'qa-monster.log' : null,
      },
    };
  }

  private async parseConfig(configPath: string): Promise<Partial<AgentConfig>> {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  private validateAndMerge(config: Partial<AgentConfig>): AgentConfig {
    const defaults = this.getSmartDefaults();
    const merged = this.deepMerge(defaults, config);

    // Validate
    if (merged.llm.costLimit && merged.llm.costLimit < 0) {
      throw new Error('costLimit must be >= 0');
    }

    if (merged.analysis.dependencyDepth < 0 || merged.analysis.dependencyDepth > 5) {
      throw new Error('dependencyDepth must be between 0 and 5');
    }

    return merged;
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
