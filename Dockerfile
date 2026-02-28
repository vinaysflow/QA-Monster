# QA Monster — Enterprise API (TypeScript + Python for .py analysis)
# Railway / Docker: supports both Node (TS/JS) and Python codebases for review and test generation.

FROM node:20-bookworm-slim

# Python 3 for parsing Python files (scripts/parse_python_ast.py)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

# Ensure Python script is executable
RUN chmod +x /app/scripts/parse_python_ast.py 2>/dev/null || true

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Railway sets PORT; default 3000 for local Docker
CMD ["node", "dist/cli/index.js", "serve"]
