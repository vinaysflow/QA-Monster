#!/bin/bash
# Analyze a file - usage: ./analyze-file.sh <file-path>

cd "/Users/vinaytripathi/Documents/QA Monster" || exit 1

if [ -z "$1" ]; then
    echo "❌ Error: Please provide a file path"
    echo "Usage: ./analyze-file.sh <file-path>"
    echo "Example: ./analyze-file.sh src/core/Agent.ts"
    exit 1
fi

echo "🔍 Analyzing: $1"
echo ""

npm run dev analyze "$1"
