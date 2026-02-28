import { ParsedFile } from '../plugins/interfaces.js';

export interface CodeChunk {
  startLine: number;
  endLine: number;
  content: string;
  type: 'function' | 'class' | 'constant' | 'data' | 'other';
  name?: string;
}

/**
 * Large Codebase Handler - Chunks large files for analysis
 * 
 * Strategies:
 * - Chunk files into logical units (functions/classes)
 * - Smart sampling for data-heavy files
 * - Iterative analysis (broad → deep)
 */
export class LargeCodebaseHandler {
  private readonly MAX_FILE_SIZE = 50000; // characters
  private readonly MAX_LINES_FOR_FULL_ANALYSIS = 1500;
  private readonly MAX_CHUNK_SIZE = 1000; // lines per chunk

  shouldChunk(file: ParsedFile): boolean {
    return (
      file.content.length > this.MAX_FILE_SIZE ||
      file.content.split('\n').length > this.MAX_LINES_FOR_FULL_ANALYSIS
    );
  }

  chunkFile(file: ParsedFile): CodeChunk[] {
    const lines = file.content.split('\n');
    const chunks: CodeChunk[] = [];

    // Strategy 1: If it's mostly data (large arrays/objects), sample it
    if (this.isDataHeavy(file)) {
      return this.sampleDataFile(file, lines);
    }

    // Strategy 2: Chunk by functions/classes
    if (file.functions && file.functions.length > 0) {
      return this.chunkByFunctions(file, lines);
    }

    if (file.classes && file.classes.length > 0) {
      return this.chunkByClasses(file, lines);
    }

    // Strategy 3: Chunk by line count
    return this.chunkByLines(lines);
  }

  private isDataHeavy(file: ParsedFile): boolean {
    // Check if file is mostly data (large arrays, exports, etc.)
    const content = file.content.toLowerCase();
    const hasLargeArray = content.includes('export const') && content.includes('[');
    const functionCount = file.functions?.length || 0;
    const classCount = file.classes?.length || 0;

    // If it has very few functions/classes but lots of content, it's likely data
    return hasLargeArray && functionCount < 5 && classCount === 0;
  }

  private sampleDataFile(file: ParsedFile, lines: string[]): CodeChunk[] {
    // For data files, sample: first 200 lines, middle 200 lines, last 200 lines
    const totalLines = lines.length;
    const sampleSize = 200;

    const chunks: CodeChunk[] = [
      {
        startLine: 1,
        endLine: Math.min(sampleSize, totalLines),
        content: lines.slice(0, sampleSize).join('\n'),
        type: 'data',
        name: 'header',
      },
    ];

    if (totalLines > sampleSize * 2) {
      const middleStart = Math.floor(totalLines / 2) - sampleSize / 2;
      chunks.push({
        startLine: middleStart,
        endLine: middleStart + sampleSize,
        content: lines.slice(middleStart, middleStart + sampleSize).join('\n'),
        type: 'data',
        name: 'middle',
      });
    }

    if (totalLines > sampleSize) {
      chunks.push({
        startLine: Math.max(1, totalLines - sampleSize),
        endLine: totalLines,
        content: lines.slice(-sampleSize).join('\n'),
        type: 'data',
        name: 'footer',
      });
    }

    return chunks;
  }

  private chunkByFunctions(file: ParsedFile, lines: string[]): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    for (const func of file.functions || []) {
      const funcLines = lines.slice(func.lineStart - 1, func.lineEnd);
      chunks.push({
        startLine: func.lineStart,
        endLine: func.lineEnd,
        content: funcLines.join('\n'),
        type: 'function',
        name: func.name,
      });
    }

    return chunks;
  }

  private chunkByClasses(file: ParsedFile, lines: string[]): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    for (const cls of file.classes || []) {
      const classLines = lines.slice(cls.lineStart - 1, cls.lineEnd);
      chunks.push({
        startLine: cls.lineStart,
        endLine: cls.lineEnd,
        content: classLines.join('\n'),
        type: 'class',
        name: cls.name,
      });
    }

    return chunks;
  }

  private chunkByLines(lines: string[]): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const chunkSize = this.MAX_CHUNK_SIZE;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      chunks.push({
        startLine: i + 1,
        endLine: Math.min(i + chunkSize, lines.length),
        content: chunkLines.join('\n'),
        type: 'other',
      });
    }

    return chunks;
  }

  identifyKeyFiles(files: ParsedFile[]): ParsedFile[] {
    // Identify files that are most important for understanding
    // Priority: files with many functions > files with classes > others
    return files
      .map((file) => ({
        file,
        priority:
          (file.functions?.length || 0) * 10 +
          (file.classes?.length || 0) * 5 +
          (file.exports?.length || 0),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10) // Top 10 files
      .map((item) => item.file);
  }

  sampleDependencies(deps: ParsedFile[], maxCount: number): ParsedFile[] {
    // Prioritize dependencies that are actually used
    return deps
      .filter((dep) => (dep.exports?.length || 0) > 0)
      .slice(0, maxCount);
  }
}
