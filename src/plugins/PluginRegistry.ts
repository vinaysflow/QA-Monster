import {
  LanguagePlugin,
  TestFrameworkPlugin,
} from './interfaces.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Plugin Registry - Manages language and framework plugins
 * 
 * First Principles:
 * 1. Easy to add new languages/frameworks
 * 2. Auto-detection works out of the box
 * 3. Fallbacks for unknown cases
 */
export class PluginRegistry {
  private languagePlugins: Map<string, LanguagePlugin> = new Map();
  private frameworkPlugins: Map<string, TestFrameworkPlugin> = new Map();

  registerLanguage(plugin: LanguagePlugin): void {
    this.languagePlugins.set(plugin.name, plugin);
    // Also register by extensions for quick lookup
    for (const ext of plugin.extensions) {
      this.languagePlugins.set(ext, plugin);
    }
  }

  registerFramework(plugin: TestFrameworkPlugin): void {
    this.frameworkPlugins.set(plugin.name, plugin);
  }

  getLanguagePlugin(languageOrExtension: string): LanguagePlugin | null {
    // Try direct name match
    if (this.languagePlugins.has(languageOrExtension)) {
      const plugin = this.languagePlugins.get(languageOrExtension)!;
      if (typeof plugin.parseFile === 'function') {
        return plugin;
      }
    }
    return null;
  }

  getLanguagePluginByExtension(filePath: string): LanguagePlugin | null {
    const ext = path.extname(filePath);
    return this.getLanguagePlugin(ext);
  }

  async getFrameworkPlugin(framework: string): Promise<TestFrameworkPlugin | null> {
    if (this.frameworkPlugins.has(framework)) {
      return this.frameworkPlugins.get(framework)!;
    }

    // Try to auto-detect
    if (framework === 'auto' || !framework) {
      return await this.autoDetectFramework();
    }

    return null;
  }

  private async autoDetectFramework(): Promise<TestFrameworkPlugin | null> {
    const projectRoot = process.cwd();

    for (const plugin of this.frameworkPlugins.values()) {
      if (await plugin.detect(projectRoot)) {
        return plugin;
      }
    }

    return null;
  }

  getAllLanguagePlugins(): LanguagePlugin[] {
    const seen = new Set<string>();
    const plugins: LanguagePlugin[] = [];
    
    for (const plugin of this.languagePlugins.values()) {
      if (!seen.has(plugin.name)) {
        seen.add(plugin.name);
        plugins.push(plugin);
      }
    }
    
    return plugins;
  }

  getAllFrameworkPlugins(): TestFrameworkPlugin[] {
    return Array.from(this.frameworkPlugins.values());
  }
}
