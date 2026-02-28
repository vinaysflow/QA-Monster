# Deploying QA Monster for the Odee Codebase

This doc answers: **how will QA Monster be deployed so it can review and generate tests for the Odee codebase?**

There are two main ways to “deploy to” or “for” Odee: run QA Monster **as a service** that has access to Odee’s code, or run QA Monster **inside Odee’s CI** on every push/PR. Both use the same product; only where it runs and how Odee’s code is provided changes.

---

## Overview

| Approach | Where QA Monster runs | Where Odee code lives | Best for |
|----------|------------------------|----------------------|----------|
| **1. Shared API service (e.g. Railway)** | One long‑running service (Railway, etc.) | Cloned into the service (or mounted) | Central team / multiple repos / manual or scripted runs |
| **2. CI inside Odee repo** | Inside Odee’s CI (e.g. GitHub Actions) | Checked out by CI | Per‑repo automation, PR checks, no separate server |

---

## Option 1: QA Monster as a service (e.g. Railway) for Odee

Here the **product** is deployed once (e.g. on Railway), and Odee’s code is made available **inside** that deployment so the API can read files by path.

### How it works

1. **Deploy QA Monster**  
   - Use the QA Monster repo’s Dockerfile (and `railway.toml` if on Railway).  
   - Set `OPENAI_API_KEY` (and optionally `PYTHON_PATH`, `QA_MONSTER_COST_LIMIT`).  
   - The service exposes `POST /api/analyze` and `POST /api/generate-tests`.

2. **Make Odee’s code available to the service**  
   The API expects **filesystem paths** (`filePath`, `projectRoot`). So Odee must exist on the same filesystem as the running process. Two common ways:

   - **A) Clone Odee at container startup**  
     - In the image’s start command or entrypoint: clone the Odee repo into a fixed path (e.g. `/workspace/odee`).  
     - Then call the API with e.g. `projectRoot: "/workspace/odee"`, `filePath: "/workspace/odee/app/main.py"`.  
   - **B) Bake Odee into the image**  
     - In the **same repo** or a fork: extend the Dockerfile to clone Odee (or copy it) into e.g. `/workspace/odee`.  
     - Every deploy then has that exact Odee revision; update by rebuilding the image.

3. **Call the API**  
   - From a script, cron, or internal tool:  
     - `POST /api/analyze` with `filePath` and `config.projectRoot` set to paths under the Odee root.  
     - Optionally `POST /api/generate-tests` with the returned package and `framework: "pytest"`.

### Example: clone Odee at startup (Option 1A)

Use a small wrapper script as the container’s start command so Odee is present before the API starts:

```dockerfile
# Optional: add to Dockerfile or use in railway start command
# COPY docker-entrypoint.sh /docker-entrypoint.sh
# ENTRYPOINT ["/docker-entrypoint.sh"]
```

**`docker-entrypoint.sh`** (example):

```bash
#!/bin/sh
set -e
WORKSPACE="${WORKSPACE:-/workspace}"
ODEE_REPO="${ODEE_REPO:-https://github.com/your-org/odee.git}"
ODEE_PATH="${WORKSPACE}/odee"

if [ -n "$ODEE_REPO" ]; then
  git clone --depth 1 "$ODEE_REPO" "$ODEE_PATH" || (cd "$ODEE_PATH" && git pull)
fi
exec node dist/cli/index.js serve
```

Then set in Railway (or env):

- `ODEE_REPO` = clone URL for Odee (optional; if unset, no clone).
- Call API with `projectRoot: "/workspace/odee"` and `filePath: "/workspace/odee/<path/to/file>.py"`.

### Example: Odee baked into the image (Option 1B)

In a Dockerfile that builds the “QA Monster for Odee” image:

```dockerfile
FROM node:20-bookworm-slim
# ... install Python, copy QA Monster app, npm ci + build ...

# Clone Odee into a known path (replace with your repo and branch/tag)
ARG ODEE_REPO=https://github.com/your-org/odee.git
ARG ODEE_REF=main
RUN apt-get update && apt-get install -y --no-install-recommends git \
  && git clone --depth 1 --branch "$ODEE_REF" "$ODEE_REPO" /workspace/odee \
  && apt-get purge -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EXPOSE 3000
CMD ["node", "dist/cli/index.js", "serve"]
```

Then:

- `projectRoot`: `"/workspace/odee"`
- `filePath`: `"/workspace/odee/<path/to/module>.py"`

So in practice: **the product is deployed once (e.g. Railway); “deployment to the Odee codebase” means Odee’s code is available inside that deployment (by clone or copy), and you call the API with paths under Odee.**

---

## Option 2: QA Monster inside Odee’s CI (no separate service)

Here the **product** is not a long‑running server; it’s run **inside the Odee repo’s CI** (e.g. GitHub Actions). “Deployment to the Odee codebase” = adding a workflow (and optionally config) to Odee’s repo.

### How it works

1. **Odee’s repo** is checked out by CI as usual.  
2. **QA Monster runs in the same job** (Docker or npm).  
3. **Paths** are the checkout path: e.g. `projectRoot: "."`, `filePath: "app/main.py"` (relative to repo root).  
4. You can **analyze** and **generate tests** in that run, then e.g. upload artifacts, comment on the PR, or fail the build if quality gates fail.

### Example: GitHub Actions in the Odee repo

Add a workflow in **Odee’s repo**, e.g. `.github/workflows/qa-monster.yml`:

```yaml
name: QA Monster

on:
  pull_request:
    paths: ['**.py']
  push:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run QA Monster (analyze)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npx github:your-org/qa-monster#main analyze app/main.py -o ./qa-out
          # Or use Docker:
          # docker run --rm -v $PWD:/repo -e OPENAI_API_KEY your-org/qa-monster:latest analyze /repo/app/main.py -o /repo/qa-out

      - name: Upload QA report
        uses: actions/upload-artifact@v4
        with:
          name: qa-monster-report
          path: qa-out/
```

- **Deployment to Odee** = merge this workflow into Odee’s repo and add `OPENAI_API_KEY` to the repo’s (or org’s) secrets.  
- No Railway or separate server; QA Monster runs only when CI runs, against the code CI checked out.

---

## Summary: “Deployed to the Odee codebase”

- **Option 1 (Service)**  
  - Deploy QA Monster once (e.g. Railway).  
  - Put Odee’s code inside that deployment (clone at startup or bake into image).  
  - Call `/api/analyze` and `/api/generate-tests` with paths under Odee’s root.  
  - **Product is deployed as a service; Odee is the codebase that service is configured to analyze.**

- **Option 2 (CI)**  
  - Add a workflow (and secrets) to the **Odee repo** that runs QA Monster (CLI or Docker) on the CI checkout.  
  - **Product is “deployed” as part of Odee’s CI; every run uses the current Odee code.**

Use Option 1 when you want a shared API for multiple repos or manual/scripted runs; use Option 2 when you want automated, per-commit/PR analysis and no extra service to operate.
