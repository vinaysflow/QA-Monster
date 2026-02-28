import express from 'express';
import { CodeReadingAgent } from '../core/Agent.js';
import { OutputFormatter } from '../output/Formatters.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Analyze code
app.post('/api/analyze', async (req, res) => {
  try {
    const { filePath, config } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const agent = new CodeReadingAgent(
      config?.projectRoot || process.cwd(),
      config?.tsConfigPath,
      config?.openAIApiKey || process.env.OPENAI_API_KEY
    );

    const qaPackage = await agent.process(filePath, config?.options);
    res.json(qaPackage);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate tests
app.post('/api/generate-tests', async (req, res) => {
  try {
    const { package: qaPackage, options } = req.body;

    if (!qaPackage) {
      return res.status(400).json({ error: 'package is required' });
    }

    const agent = new CodeReadingAgent();
    const tests = await agent.generateTests(qaPackage, options);
    res.json({ tests });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Batch analyze
app.post('/api/batch-analyze', async (req, res) => {
  try {
    const { filePaths, config } = req.body;

    if (!filePaths || !Array.isArray(filePaths)) {
      return res.status(400).json({ error: 'filePaths array is required' });
    }

    const agent = new CodeReadingAgent(
      config?.projectRoot || process.cwd(),
      config?.tsConfigPath,
      config?.openAIApiKey || process.env.OPENAI_API_KEY
    );

    const results = await Promise.all(
      filePaths.map((path: string) => agent.process(path, config?.options))
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export function startServer(port: number = 3000): void {
  app.listen(port, () => {
    console.log(`🚀 QA Monster API server listening on port ${port}`);
  });
}

// CLI command to start server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000');
  startServer(port);
}
