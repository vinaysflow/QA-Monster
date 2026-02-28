# Proprietary Tech Scope

QA Monster is scoped to support the following proprietary codebases for code review and test generation. This document is the single source of truth for which codebases are covered, how to run QA Monster for each, and where to find detailed docs.

---

## Supported Codebases

| Codebase | Language(s) | Test Framework | How to Run | Detailed Docs |
|----------|-------------|----------------|------------|---------------|
| **Odee** | Python | pytest | API (Railway) or CI in Odee repo; `projectRoot` = Odee root | [DEPLOY_TO_ODEE.md](DEPLOY_TO_ODEE.md), [RAILWAY_PYTHON_ENTERPRISE.md](RAILWAY_PYTHON_ENTERPRISE.md) |
| **PDF OCR MVP** (pdf-ocr-mvp) | Python | pytest | CLI or API; `projectRoot` = path to `pdf-ocr-mvp` | See usage below |

---

## Odee

Deploy QA Monster as a service (e.g. Railway) and make the Odee codebase available inside the container (clone at startup or bake into the image), then call the API with `projectRoot` and `filePath` under the Odee root. Alternatively, run QA Monster inside Odee's CI (GitHub Actions) on every push or PR. Tests are generated for pytest.

- Full deployment guide: [DEPLOY_TO_ODEE.md](DEPLOY_TO_ODEE.md)
- Railway setup: [RAILWAY_PYTHON_ENTERPRISE.md](RAILWAY_PYTHON_ENTERPRISE.md)

### Quick example (CLI, local)

```bash
npm run dev analyze /path/to/odee/app/main.py -o ./qa-output
```

### Quick example (API)

```bash
curl -X POST "https://YOUR_RAILWAY_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/workspace/odee/app/main.py",
    "config": {
      "projectRoot": "/workspace/odee",
      "options": { "maxDependencyDepth": 2, "costLimit": 10 }
    }
  }'
```

---

## PDF OCR MVP (pdf-ocr-mvp)

A production PDF extraction pipeline supporting born-digital, scanned, and mixed PDFs with Tesseract, Sarvam Vision, and PaddleOCR. The codebase is Python (FastAPI + CLI) with pytest for tests.

Run QA Monster locally (CLI) or via the API by pointing `projectRoot` at the `pdf-ocr-mvp` directory.

### Quick example (CLI, local)

```bash
npm run dev analyze /path/to/pdf-ocr-mvp/app/extract.py -o ./qa-output
```

### Quick example (API)

```bash
curl -X POST "http://localhost:3000/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/pdf-ocr-mvp/app/extract.py",
    "config": {
      "projectRoot": "/path/to/pdf-ocr-mvp",
      "options": { "maxDependencyDepth": 2, "costLimit": 10 }
    }
  }'
```

### Generate tests

Pass the QA package from `/api/analyze` (or from `qa-output/qa-output.json`) into test generation:

```bash
npm run dev generate qa-output/qa-output.json -f pytest
```

Or via the API:

```bash
curl -X POST "http://localhost:3000/api/generate-tests" \
  -H "Content-Type: application/json" \
  -d '{
    "package": { ... },
    "options": { "framework": "pytest" }
  }'
```

---

## Adding Another Codebase

To add a new proprietary codebase to QA Monster's scope:

1. Add a row to the **Supported Codebases** table above with the codebase name, language(s), test framework, how to run, and a link to any detailed docs.
2. Add a short section (like the ones above) with a one-paragraph description, a CLI example, and an API example.
3. Ensure the codebase's language and test framework are supported by QA Monster's plugins. Currently supported: **TypeScript/JavaScript** (Jest, Vitest) and **Python** (pytest). If the codebase uses a different language or framework, a new plugin is needed first.
