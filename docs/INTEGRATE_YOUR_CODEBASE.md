# Integrate Your Codebase with QA Monster

QA Monster works with any codebase that uses a supported language and test framework. This guide shows how to point QA Monster at your project and start generating code reviews and tests.

---

## Supported Languages & Frameworks

| Language | Extensions | Test Framework(s) | Parser |
|----------|-----------|-------------------|--------|
| TypeScript / JavaScript | `.ts`, `.tsx`, `.js`, `.jsx` | Jest, Vitest | ts-morph |
| Python | `.py` | Pytest | Python AST script (requires Python 3.9+) |

Need another language? QA Monster uses a plugin system — see [Adding a Language Plugin](#adding-a-language-plugin) below.

---

## Option 1: CLI (local)

The fastest way to try QA Monster on your project.

```bash
# Analyze a single file
npm run dev analyze /path/to/your-project/src/main.ts -o ./qa-output

# Analyze a Python file
npm run dev analyze /path/to/your-project/app/handler.py -o ./qa-output

# Generate tests from the analysis
npm run dev generate qa-output/qa-output.json -f jest    # or pytest, vitest
```

QA Monster auto-detects the project root (by walking up to find `package.json`, `tsconfig.json`, `pyproject.toml`, or `requirements.txt`) and the test framework.

---

## Option 2: REST API

Run QA Monster as a service and call it from scripts, dashboards, or other tools.

```bash
# Start the server
npm run dev serve   # dev
npm start           # production (after npm run build)
```

### Analyze

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/your-project/src/main.ts",
    "config": {
      "projectRoot": "/path/to/your-project",
      "options": { "maxDependencyDepth": 2, "costLimit": 10 }
    }
  }'
```

### Generate tests

```bash
curl -X POST http://localhost:3000/api/generate-tests \
  -H "Content-Type: application/json" \
  -d '{
    "package": { "...QA package from /api/analyze..." },
    "options": { "framework": "jest" }
  }'
```

### Batch analyze

```bash
curl -X POST http://localhost:3000/api/batch-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "filePaths": [
      "/path/to/your-project/src/auth.ts",
      "/path/to/your-project/src/payments.ts"
    ],
    "config": {
      "projectRoot": "/path/to/your-project",
      "options": { "costLimit": 20 }
    }
  }'
```

---

## Option 3: CI/CD (GitHub Actions)

Add QA Monster to your repo so every PR gets an automated code review and test generation.

```yaml
name: QA Monster

on:
  pull_request:
    paths: ['**.ts', '**.js', '**.py']

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
          npx github:vinaysflow/QA-Monster#main analyze src/main.ts -o ./qa-out

      - uses: actions/upload-artifact@v4
        with:
          name: qa-report
          path: qa-out/
```

Add `OPENAI_API_KEY` to your repo's secrets (Settings → Secrets → Actions).

---

## Option 4: Docker / Railway (cloud deploy)

Deploy QA Monster as a hosted service. The Dockerfile includes Node 20 + Python 3.

```bash
# Local Docker
docker build -t qa-monster .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... qa-monster
```

For Railway, see [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md).

To analyze a codebase that lives in a separate repo, make it available inside the container:

- **Clone at startup**: Add a startup script that clones your target repo into `/workspace/my-project`, then call the API with `projectRoot: "/workspace/my-project"`.
- **Bake into the image**: Extend the Dockerfile to clone or copy the target repo at build time.
- **Mount a volume**: Map a local directory into the container with `docker run -v /path/to/project:/workspace/project`.

---

## Adding a Language Plugin

QA Monster's plugin system lets you add support for any language:

1. Create a new class implementing the `LanguagePlugin` interface in `src/plugins/languages/`.
2. Register it in `src/core/Agent.ts` → `registerBuiltInPlugins()`.
3. Create a matching test framework plugin in `src/plugins/frameworks/` if needed.

See the existing `TypeScriptPlugin.ts` and `PythonPlugin.ts` for reference implementations.

---

## Tips

- **Auto-detection**: QA Monster walks up from the analyzed file to find the project root. Make sure your project has a `package.json`, `tsconfig.json`, `pyproject.toml`, or `requirements.txt` at its root.
- **Cost control**: Set `QA_MONSTER_COST_LIMIT` in your environment or pass `costLimit` in the API config. Default is $10 per run.
- **Python files**: The machine running QA Monster needs Python 3.9+ on PATH (or set `PYTHON_PATH` env var). The Docker image includes this.
- **Large projects**: Use `--max-depth 1` to limit dependency traversal for faster initial runs, then increase as needed.
