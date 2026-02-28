# QA Monster - Quick Start Guide

## ⚠️ IMPORTANT: Always run commands from the QA Monster directory!

```bash
cd /Users/vinaytripathi/Documents/QA\ Monster
```

---

## 1. Test the Demo Script

```bash
# Make sure you're in QA Monster directory
cd /Users/vinaytripathi/Documents/QA\ Monster

# Run demo (tsx is installed, use npx)
npx tsx demo/demo-script.ts
```

---

## 2. Analyze a File

```bash
# Make sure you're in QA Monster directory
cd /Users/vinaytripathi/Documents/QA\ Monster

# Analyze a file (replace with actual file path)
npm run dev analyze src/core/Agent.ts

# Or analyze any TypeScript file
npm run dev analyze test-security-file.ts
```

---

## 3. Start Dashboard

```bash
# Make sure you're in QA Monster directory
cd /Users/vinaytripathi/Documents/QA\ Monster

# Go to dashboard and install
cd dashboard
npm install

# Start dev server
npm run dev
```

Then open: http://localhost:3000

---

## 4. VS Code Extension

```bash
# Make sure you're in QA Monster directory
cd /Users/vinaytripathi/Documents/QA\ Monster

# Go to extension directory
cd vscode-extension
npm install
npm run compile
```

Then in VS Code:
1. Press F5 to open extension development host
2. Open a TypeScript file
3. Press Cmd+Shift+P → "QA Monster: Analyze Current File"

---

## Common Issues Fixed

✅ **"tsx not found"** → Use `npx tsx` instead of just `tsx`  
✅ **"directory not found"** → Make sure you're in `/Users/vinaytripathi/Documents/QA Monster`  
✅ **"command not found"** → Use `npm run dev` instead of direct commands  

---

## Verify Setup

```bash
cd /Users/vinaytripathi/Documents/QA\ Monster

# Check everything exists
ls -d dashboard vscode-extension demo

# Check build works
npm run build

# Check demo file exists
ls demo/demo-script.ts
```

---

## Working Commands (Copy & Paste)

```bash
# 1. Navigate to project
cd /Users/vinaytripathi/Documents/QA\ Monster

# 2. Run demo
npx tsx demo/demo-script.ts

# 3. Analyze a file
npm run dev analyze src/core/Agent.ts

# 4. Start dashboard
cd dashboard && npm install && npm run dev

# 5. Build VS Code extension
cd vscode-extension && npm install && npm run compile
```
