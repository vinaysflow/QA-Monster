#!/bin/bash
# Quick test script - verifies everything works

echo "🔍 QA Monster Quick Test"
echo "========================"
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: Not in QA Monster directory!"
    echo "   Run: cd /Users/vinaytripathi/Documents/QA\\ Monster"
    exit 1
fi

echo "✅ In correct directory"
echo ""

# Check build
echo "📦 Testing build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build: PASSING"
else
    echo "❌ Build: FAILED"
    exit 1
fi

# Check directories
echo ""
echo "📁 Checking directories..."
[ -d "dashboard" ] && echo "✅ dashboard exists" || echo "❌ dashboard missing"
[ -d "vscode-extension" ] && echo "✅ vscode-extension exists" || echo "❌ vscode-extension missing"
[ -d "demo" ] && echo "✅ demo exists" || echo "❌ demo missing"

# Check key files
echo ""
echo "📄 Checking key files..."
[ -f "demo/demo-script.ts" ] && echo "✅ demo-script.ts exists" || echo "❌ demo-script.ts missing"
[ -f "src/core/Agent.ts" ] && echo "✅ Agent.ts exists" || echo "❌ Agent.ts missing"

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
if npm list tsx > /dev/null 2>&1; then
    echo "✅ tsx installed"
else
    echo "❌ tsx not installed - run: npm install"
fi

echo ""
echo "✅ All checks complete!"
echo ""
echo "🚀 Try these commands:"
echo "   1. npx tsx demo/demo-script.ts"
echo "   2. npm run dev analyze src/core/Agent.ts"
echo "   3. cd dashboard && npm install && npm run dev"
