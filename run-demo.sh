#!/bin/bash
# Run this from ANYWHERE - it will navigate to the right directory

cd "/Users/vinaytripathi/Documents/QA Monster" || exit 1

echo "🚀 Running QA Monster Demo..."
echo ""

npx tsx demo/demo-script.ts
