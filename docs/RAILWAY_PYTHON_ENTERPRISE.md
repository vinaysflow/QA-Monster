# QA Monster on Railway — Python / Enterprise Setup

This guide gets QA Monster running on **Railway** so you can **review Python codebases (e.g. Odee) and generate test cases** via the API.

## What’s included

- **Python support**: `.py` files are parsed via a small Python AST script (no native Node addons). Requires Python 3.9+ in the environment (included in the Docker image).
- **Pytest**: Auto-detection and test generation for `pytest` (pyproject.toml, requirements.txt).
- **API**: `POST /api/analyze`, `POST /api/generate-tests`, `POST /api/batch-analyze` for review and test generation.
- **Railway**: Dockerfile + `railway.toml` for one-click deploy; uses `PORT` and `OPENAI_API_KEY`.

## Deploy on Railway

### 1. Connect the repo

- Create a new project on [Railway](https://railway.app).
- Connect your Git repo (this QA Monster repo).

### 2. Configure build and run

- **Build**: Railway will use the repo’s `Dockerfile` (Node 20 + Python 3).
- **Start**: `node dist/cli/index.js serve` (or `npm start`). The API listens on `PORT` (set by Railway).

### 3. Set environment variables

In Railway → your service → **Variables**:

| Variable           | Required | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `OPENAI_API_KEY`   | Yes      | OpenAI API key for LLM-based analysis and tests |
| `PORT`             | No       | Set by Railway automatically                    |
| `PYTHON_PATH`      | No       | Override Python binary (default: `python3`)      |
| `QA_MONSTER_COST_LIMIT` | No | Max cost per run in USD (default: 10)      |

### 4. Deploy

Push to the connected branch; Railway will build and deploy. The API will be available at the generated URL, e.g. `https://your-app.up.railway.app`.

## Using the API for a Python codebase (e.g. Odee)

### Analyze a Python file

```bash
# Replace YOUR_RAILWAY_URL and path with your deployed URL and repo path.
curl -X POST "https://YOUR_RAILWAY_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/inside/repo/app/extract.py",
    "config": {
      "projectRoot": "/path/inside/repo",
      "options": {
        "maxDependencyDepth": 2,
        "costLimit": 10
      }
    }
  }'
```

**Important**: `filePath` and `projectRoot` must be paths the QA Monster container can read. For a **remote** repo (e.g. Odee), you have two options:

- **Option A — Repo in container**: Clone Odee into the image or a mounted volume and pass paths under that root (e.g. `projectRoot: "/workspace/odee"`, `filePath: "/workspace/odee/app/main.py"`). You’d extend the Dockerfile or add a startup step that clones the repo.
- **Option B — Send content (custom endpoint)**: Add an endpoint that accepts file content + language and runs analysis without filesystem paths. (Not implemented by default; you’d add it to `server.ts`.)

For a **single service** that only ever analyzes one repo (e.g. Odee), Option A is typical: build an image that includes or clones Odee and set `projectRoot` to that path.

### Generate tests from the QA package

```bash
curl -X POST "https://YOUR_RAILWAY_URL/api/generate-tests" \
  -H "Content-Type: application/json" \
  -d '{
    "package": { ... },
    "options": {
      "framework": "pytest",
      "outputDir": "./tests/generated"
    }
  }'
```

Use the `package` returned from `/api/analyze`. If the project is pytest-based, you can omit `framework` for auto-detection.

## Local run (with Python)

- **Node**: `npm run build && npm start` (or `npm run serve`).
- **Python**: Ensure `python3` is on `PATH` (or set `PYTHON_PATH`). The plugin runs `scripts/parse_python_ast.py` to parse `.py` files.

## Supported languages and frameworks

| Language   | Extensions | Test framework |
|-----------|------------|----------------|
| TypeScript/JS | .ts, .tsx, .js, .jsx | Jest, Vitest |
| Python    | .py        | Pytest        |

## Troubleshooting

- **“Unsupported file type”**: Ensure the file has extension `.py` (or another supported one) and that the Python plugin is loaded (you should see it in the list of supported extensions in the error).
- **“Failed to parse Python file”**: The container must have Python 3.9+ (the Dockerfile adds it). If you use a custom image, install Python and ensure `scripts/parse_python_ast.py` is present and runnable.
- **“Test framework not supported”**: For Python, auto-detect looks for pytest in `pyproject.toml` or `requirements.txt`. Pass `framework: "pytest"` explicitly if needed.
- **Cost limit**: Set `QA_MONSTER_COST_LIMIT` or pass `config.options.costLimit` to cap spending per run.

## Summary

- **Enterprise Python**: Use the Python plugin + Pytest plugin; deploy with the provided Dockerfile so Python is available.
- **Railway**: Use the repo’s Dockerfile and `railway.toml`; set `OPENAI_API_KEY` (and optionally `PYTHON_PATH`, `QA_MONSTER_COST_LIMIT`).
- **Odee (or any Python repo)**: Either (A) make the repo available inside the container and call `/api/analyze` with paths under that root, or (B) add a custom endpoint that accepts file content and runs analysis.
- **PDF OCR MVP** (pdf-ocr-mvp): Same flow — ensure the repo is available in the container and call `/api/analyze` with `projectRoot` and `filePath` under its root. For the full list of supported proprietary codebases and per-codebase usage, see [PROPRIETARY_TECH_SCOPE.md](PROPRIETARY_TECH_SCOPE.md).
