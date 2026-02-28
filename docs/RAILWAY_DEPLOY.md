# Deploying QA Monster on Railway

Deploy QA Monster as a hosted API service on [Railway](https://railway.app) — one-click setup with Python + Node support.

---

## What's included

- **Node 20 + Python 3** in a single Docker image
- **TypeScript/JavaScript** and **Python** code analysis out of the box
- **REST API**: `/api/analyze`, `/api/generate-tests`, `/api/batch-analyze`, `/health`
- **`railway.toml`** for zero-config Railway deploys

---

## Deploy

### 1. Connect the repo

- Create a new project on [Railway](https://railway.app).
- Connect your Git repo (this QA Monster repo).

### 2. Set environment variables

In Railway → your service → **Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM-powered analysis |
| `PORT` | No | Set automatically by Railway |
| `PYTHON_PATH` | No | Override Python binary (default: `python3`) |
| `QA_MONSTER_COST_LIMIT` | No | Max cost per run in USD (default: 10) |

### 3. Deploy

Push to the connected branch. Railway builds from the Dockerfile and starts the API. Your service URL will be something like `https://your-app.up.railway.app`.

### 4. Verify

```bash
curl https://your-app.up.railway.app/health
```

---

## Using the API

### Analyze a file

```bash
curl -X POST "https://your-app.up.railway.app/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/workspace/my-project/src/main.ts",
    "config": {
      "projectRoot": "/workspace/my-project",
      "options": { "maxDependencyDepth": 2, "costLimit": 10 }
    }
  }'
```

`filePath` and `projectRoot` must be paths the container can read. To analyze a codebase that lives in a separate repo:

- **Clone at startup** — Add a startup script that clones your target repo into `/workspace/my-project`, then call the API with paths under that root.
- **Bake into the image** — Extend the Dockerfile to clone the target repo at build time.

### Generate tests

```bash
curl -X POST "https://your-app.up.railway.app/api/generate-tests" \
  -H "Content-Type: application/json" \
  -d '{
    "package": { "...QA package from /api/analyze..." },
    "options": { "framework": "pytest" }
  }'
```

If the project uses pytest, jest, or vitest, you can omit `framework` for auto-detection.

---

## Supported languages and frameworks

| Language | Extensions | Test Framework |
|----------|-----------|----------------|
| TypeScript / JavaScript | `.ts`, `.tsx`, `.js`, `.jsx` | Jest, Vitest |
| Python | `.py` | Pytest |

---

## Troubleshooting

- **"Unsupported file type"** — Ensure the file has a supported extension and the corresponding plugin is loaded.
- **"Failed to parse Python file"** — The container must have Python 3.9+ (the Dockerfile includes it). Verify `scripts/parse_python_ast.py` exists.
- **"Test framework not supported"** — Auto-detect looks for framework config files. Pass `framework` explicitly if needed.
- **Cost limit** — Set `QA_MONSTER_COST_LIMIT` or pass `config.options.costLimit` per request.

---

## Summary

1. Connect this repo to Railway
2. Set `OPENAI_API_KEY`
3. Deploy — the API is live
4. Make your target codebase available in the container (clone or mount)
5. Call `/api/analyze` and `/api/generate-tests` with paths to your code
