# QA Monster Agent

Autonomous code reading agent that analyzes code and generates comprehensive QA test packages. Works on any codebase with any language/framework combination.

## Features

- ✅ **Language Agnostic**: Supports TypeScript, JavaScript, Python, Java, Go (extensible)
- ✅ **Framework Agnostic**: Auto-detects Jest, Vitest, Pytest, JUnit, etc.
- ✅ **Cost Optimized**: Uses GPT-3.5-turbo by default, smart caching, context optimization
- ✅ **Large Codebase Ready**: Intelligent chunking and sampling for >10k line codebases
- ✅ **Zero-Config**: Works out of the box, configurable when needed
- ✅ **Production Ready**: CLI, API, error handling, logging

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
OPENAI_API_KEY=your_api_key_here
QA_MONSTER_COST_LIMIT=10.00
```

### Usage

#### Analyze a file

```bash
npm run dev analyze src/services/matching/MatchingService.ts
```

#### Generate tests

```bash
npm run dev generate qa-output/qa-output.json
```

#### Start API server

```bash
npm run dev serve
```

## CLI Commands

### `analyze <file>`

Analyze a code file and generate QA package.

Options:
- `-o, --output <dir>`: Output directory (default: `./qa-output`)
- `-f, --format <formats>`: Output formats: `json,markdown,code` (default: `json,code`)
- `--cost-limit <amount>`: Maximum cost in USD (default: `10.00`)
- `--max-depth <depth>`: Maximum dependency depth (default: `2`)
- `--verbose`: Verbose logging

### `generate <package>`

Generate test code from QA package.

Options:
- `-o, --output <dir>`: Output directory (default: `./tests/generated`)
- `-f, --framework <name>`: Test framework (auto-detect if not specified)

### `watch <file>`

Watch a file and auto-generate tests on change.

Options:
- `-d, --debounce <ms>`: Debounce delay in milliseconds (default: `1000`)

## API

### POST `/api/analyze`

Analyze a code file.

Request:
```json
{
  "filePath": "src/services/matching/MatchingService.ts",
  "config": {
    "options": {
      "maxDependencyDepth": 2,
      "costLimit": 10.00
    }
  }
}
```

Response:
```json
{
  "understanding": { ... },
  "codeContext": { ... },
  "insights": { ... },
  "recommendations": { ... }
}
```

### POST `/api/generate-tests`

Generate test code from QA package.

Request:
```json
{
  "package": { ... },
  "options": {
    "framework": "jest",
    "outputDir": "./tests/generated"
  }
}
```

## Configuration

Create `qa-monster.config.json`:

```json
{
  "llm": {
    "model": "gpt-3.5-turbo",
    "costLimit": 10.00
  },
  "analysis": {
    "dependencyDepth": 2,
    "maxFilesToRead": 50
  },
  "testGeneration": {
    "coverage": "standard",
    "includeEdgeCases": true
  }
}
```

## Architecture

- **Plugin System**: Extensible language and framework plugins
- **Cost Optimization**: GPT-3.5-turbo default, smart caching, context selection
- **Large Codebase Handling**: Chunking, sampling, iterative analysis
- **Multi-Level Caching**: Files, dependencies, LLM responses, analysis results

## Supported Languages

- TypeScript/JavaScript (via ts-morph)
- **Python** (via AST script — requires Python 3.9+ on path for `.py` analysis)
- Java (via JavaParser)
- Go (via go/ast)

## Supported Test Frameworks

- Jest
- Vitest
- Pytest (Python)
- JUnit

## Cost Optimization

- Default model: GPT-3.5-turbo (~$0.001/1k tokens input, $0.002/1k tokens output)
- Smart context selection (only relevant code)
- Aggressive caching
- Chunking for large files
- Configurable cost limits

## Performance

- Small files (<500 lines): ~10-20s, $0.01-0.05
- Medium files (500-2000 lines): ~30-60s, $0.05-0.15
- Large files (>2000 lines): ~1-3min, $0.15-0.50

## Development

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format
```

## License

UNLICENSED — All rights reserved. This is proprietary software.

## Enterprise & Railway (Python codebases)

To run QA Monster for **Python codebases** (e.g. Odee) and deploy on **Railway** for review and test generation, see **[docs/RAILWAY_PYTHON_ENTERPRISE.md](docs/RAILWAY_PYTHON_ENTERPRISE.md)**. The Dockerfile includes Python 3 for parsing `.py` files; set `OPENAI_API_KEY` and deploy.

## Proprietary Tech Scope

QA Monster is explicitly scoped to support the following proprietary codebases for code review and test generation:

- **Odee** (Python, pytest) — Deploy via Railway or run inside Odee's CI. See [docs/DEPLOY_TO_ODEE.md](docs/DEPLOY_TO_ODEE.md).
- **PDF OCR MVP** (Python, pytest) — Run CLI or API with `projectRoot` pointing at the pdf-ocr-mvp repo. See [docs/PROPRIETARY_TECH_SCOPE.md](docs/PROPRIETARY_TECH_SCOPE.md).

For the full list of supported codebases, per-codebase usage examples, and how to add more, see **[docs/PROPRIETARY_TECH_SCOPE.md](docs/PROPRIETARY_TECH_SCOPE.md)**.
