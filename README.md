# QA Monster

Autonomous code analysis agent that reads your codebase, understands it, and generates comprehensive QA test packages — for any language, any framework, any team.

---

## Who is this for?

| You are… | QA Monster helps you… |
|----------|----------------------|
| **Solo developer** | Generate tests you'd never write yourself — edge cases, error paths, security checks |
| **Startup team** | Ship faster with auto-generated test suites and code reviews on every PR |
| **QA / SDET engineer** | Get a head start on test plans, coverage analysis, and regression scenarios |
| **Enterprise team** | Enforce quality gates, run security scans (SCA + SAST), and integrate into CI/CD |
| **Open-source maintainer** | Audit contributions with automated code review and test generation |

Works on **any codebase** — point it at your project and go.

---

## Features

- **Language Agnostic** — TypeScript, JavaScript, Python today; plugin system for any language
- **Framework Agnostic** — Auto-detects Jest, Vitest, Pytest; extensible for others
- **LLM-Powered Understanding** — Uses GPT-3.5-turbo to understand intent, not just syntax
- **Cost Optimized** — Smart caching, context selection, configurable spend limits
- **Large Codebase Ready** — Intelligent chunking and sampling for 10k+ line projects
- **Security Scanning** — Built-in SCA (npm audit / Snyk) and SAST pattern detection
- **Quality Gates** — Configurable pass/fail rules for complexity, coverage, security
- **Auto-Fix Engine** — Suggests and generates patches for common issues
- **Zero Config** — Works out of the box; fully configurable when you need it
- **Multiple Interfaces** — CLI, REST API, CI/CD integration, VS Code extension scaffold

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/vinaysflow/QA-Monster.git
cd QA-Monster
npm install
```

### 2. Configure

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
QA_MONSTER_COST_LIMIT=10.00
```

### 3. Build

```bash
npm run build
```

### 4. Analyze your code

```bash
# Point at any file in your project
npm run dev analyze /path/to/your-project/src/app.ts -o ./qa-output

# Python works too
npm run dev analyze /path/to/your-project/app/main.py -o ./qa-output
```

### 5. Generate tests

```bash
npm run dev generate qa-output/qa-output.json
```

That's it. QA Monster reads your code, understands it, and produces a full test suite.

---

## Usage

### CLI

#### `analyze <file>`

Analyze a source file and produce a QA package (code review + test plan).

```bash
npm run dev analyze src/services/UserService.ts -o ./qa-output
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./qa-output` |
| `-f, --format <formats>` | Output formats: `json`, `markdown`, `code` | `json,code` |
| `--cost-limit <amount>` | Max cost in USD | `10.00` |
| `--max-depth <depth>` | Dependency traversal depth | `2` |
| `--verbose` | Verbose logging | off |

#### `generate <package>`

Generate runnable test code from a QA package.

```bash
npm run dev generate qa-output/qa-output.json -f jest
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./tests/generated` |
| `-f, --framework <name>` | Test framework (`jest`, `vitest`, `pytest`) | auto-detect |

#### `watch <file>`

Watch a file and re-generate tests on every save.

```bash
npm run dev watch src/services/UserService.ts
```

#### `serve`

Start the REST API server.

```bash
npm run dev serve
```

---

### REST API

Start the server with `npm run dev serve` (development) or `npm start` (production). Default port: **3000**.

#### `POST /api/analyze`

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/your-project/src/app.ts",
    "config": {
      "projectRoot": "/path/to/your-project",
      "options": { "maxDependencyDepth": 2, "costLimit": 10 }
    }
  }'
```

#### `POST /api/generate-tests`

```bash
curl -X POST http://localhost:3000/api/generate-tests \
  -H "Content-Type: application/json" \
  -d '{
    "package": { "...QA package from /api/analyze..." },
    "options": { "framework": "jest" }
  }'
```

#### `POST /api/batch-analyze`

Analyze multiple files in one request.

#### `GET /health`

Health check endpoint (useful for deployment probes).

---

### CI/CD Integration

Add QA Monster to any repo's CI pipeline. Example for GitHub Actions:

```yaml
name: QA Monster

on:
  pull_request:
    paths: ['**.ts', '**.py', '**.js']

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run QA Monster
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npx github:vinaysflow/QA-Monster#main analyze src/app.ts -o ./qa-out

      - uses: actions/upload-artifact@v4
        with:
          name: qa-report
          path: qa-out/
```

---

## Configuration

Optional `qa-monster.config.json` in your project root:

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

---

## Supported Languages

| Language | Extensions | Parser |
|----------|-----------|--------|
| TypeScript / JavaScript | `.ts`, `.tsx`, `.js`, `.jsx` | ts-morph |
| Python | `.py` | Python AST (requires Python 3.9+ on PATH) |

More languages can be added via the plugin system — see [docs/INTEGRATE_YOUR_CODEBASE.md](docs/INTEGRATE_YOUR_CODEBASE.md).

## Supported Test Frameworks

| Framework | Language | Detection |
|-----------|----------|-----------|
| Jest | TypeScript / JavaScript | `package.json` |
| Vitest | TypeScript / JavaScript | `vite.config.*` or `package.json` |
| Pytest | Python | `pyproject.toml`, `requirements.txt`, `setup.py` |

---

## Deployment

### Local

```bash
npm run build && npm start
```

### Docker

```bash
docker build -t qa-monster .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... qa-monster
```

The Dockerfile includes Node 20 + Python 3, so both TS/JS and Python codebases work out of the box.

### Railway (one-click cloud deploy)

See [docs/RAILWAY_DEPLOY.md](docs/RAILWAY_DEPLOY.md) for the full guide. TL;DR:

1. Connect this repo on [railway.app](https://railway.app)
2. Set `OPENAI_API_KEY` in Variables
3. Deploy — the API is live at your Railway URL

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  CLI / API  │────▶│  Core Agent   │────▶│  Plugin Registry │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │                  │           │
                    ┌──────▼───────┐   ┌──────▼──┐  ┌─────▼─────┐
                    │  LLM Service │   │Language  │  │ Framework │
                    │  (OpenAI)    │   │ Plugins  │  │  Plugins  │
                    └──────────────┘   └─────────┘  └───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
        │ Security │ │ Quality  │ │ Auto-Fix │
        │ Scanner  │ │  Gates   │ │  Engine  │
        └──────────┘ └──────────┘ └──────────┘
```

- **Plugin System** — Extensible language and framework support
- **Cost Optimization** — GPT-3.5-turbo default, multi-level caching, smart context selection
- **Large Codebase Handling** — Chunking, sampling, iterative analysis
- **Security** — SCA (npm audit, Snyk) + SAST pattern detection

---

## Cost Estimates

| Codebase size | Time | Estimated cost |
|--------------|------|---------------|
| Small (<500 lines) | ~10–20s | $0.01–0.05 |
| Medium (500–2k lines) | ~30–60s | $0.05–0.15 |
| Large (2k+ lines) | ~1–3 min | $0.15–0.50 |

---

## Development

```bash
npm run build      # Compile TypeScript
npm test           # Run test suite
npm run lint       # Lint
npm run format     # Prettier
npm run dev        # Run CLI in dev mode (tsx)
```

---

## License

UNLICENSED — All rights reserved. This is proprietary software.
