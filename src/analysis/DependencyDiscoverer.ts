import { PluginRegistry } from '../plugins/PluginRegistry.js';
import { LanguagePlugin, ParsedFile, Dependency } from '../plugins/interfaces.js';
import * as path from 'path';

/**
 * Dependency Discoverer - Discovers dependencies with parallel processing and caching
 */
export class DependencyDiscoverer {
  constructor(
    private pluginRegistry: PluginRegistry,
    private projectRoot: string
  ) {}

  async discoverDependencies(
    file: ParsedFile,
    plugin: LanguagePlugin,
    projectRoot: string,
    maxDepth: number = 2
  ): Promise<ParsedFile[]> {
    const discovered = new Set<string>();
    const files: ParsedFile[] = [];
    const queue: { file: ParsedFile; depth: number }[] = [{ file, depth: 0 }];

    while (queue.length > 0) {
      const { file: currentFile, depth } = queue.shift()!;

      if (depth >= maxDepth) continue;
      if (discovered.has(currentFile.path)) continue;

      discovered.add(currentFile.path);
      if (depth > 0) {
        files.push(currentFile);
      }

      // Find dependencies of this file
      const dependencies = await plugin.findDependencies(currentFile, projectRoot);

      // Process dependencies in batches (parallel)
      const batchSize = 10;
      for (let i = 0; i < dependencies.length; i += batchSize) {
        const batch = dependencies.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (dep) => {
            if (!discovered.has(dep.path)) {
              try {
                const depFile = await plugin.parseFile(dep.path);
                return { file: depFile, depth: depth + 1 };
              } catch (error) {
                // Skip if can't read
                return null;
              }
            }
            return null;
          })
        );

        // Add valid results to queue
        for (const result of batchResults) {
          if (result) {
            queue.push(result);
          }
        }
      }
    }

    return files;
  }
}
