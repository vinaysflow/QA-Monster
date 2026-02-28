import { ParsedFile } from '../plugins/interfaces.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface CachedFile {
  content: ParsedFile;
  hash: string;
  timestamp: number;
}

/**
 * Multi-level cache system for files, dependencies, LLM responses, and analysis results
 */
export class CacheManager {
  private fileCache: Map<string, CachedFile> = new Map();
  private llmCache: Map<string, string> = new Map();
  private analysisCache: Map<string, any> = new Map();
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(process.cwd(), '.qa-monster-cache');
    this.ensureCacheDir();
  }

  async getParsedFile(filePath: string): Promise<ParsedFile | null> {
    const cached = this.fileCache.get(filePath);
    if (!cached) return null;

    // Check if file changed
    const currentHash = await this.hashFile(filePath);
    if (currentHash === cached.hash) {
      return cached.content;
    }

    // File changed, remove from cache
    this.fileCache.delete(filePath);
    return null;
  }

  async setParsedFile(filePath: string, content: ParsedFile): Promise<void> {
    const hash = await this.hashFile(filePath);
    this.fileCache.set(filePath, {
      content,
      hash,
      timestamp: Date.now(),
    });
  }

  async getLLMResponse(key: string): Promise<string | null> {
    return this.llmCache.get(key) || null;
  }

  async setLLMResponse(key: string, response: string): Promise<void> {
    this.llmCache.set(key, response);
  }

  async getAnalysis(key: string): Promise<any | null> {
    return this.analysisCache.get(key) || null;
  }

  async setAnalysis(key: string, analysis: any): Promise<void> {
    this.analysisCache.set(key, analysis);
  }

  clear(): void {
    this.fileCache.clear();
    this.llmCache.clear();
    this.analysisCache.clear();
  }

  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [key, value] of this.fileCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.fileCache.delete(key);
      }
    }
  }

  private async hashFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch {
      // Ignore
    }
  }
}
