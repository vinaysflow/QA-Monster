# ✅ FIXED - Working Commands

## The Problem
You were in the wrong directory (`~` instead of `QA Monster`) and using wrong command syntax.

## ✅ CORRECT Commands (Copy & Paste These)

### Step 1: Always navigate to QA Monster first
```bash
cd /Users/vinaytripathi/Documents/QA\ Monster
```

### Step 2: Run Demo Script
```bash
npx tsx demo/demo-script.ts
```
**NOT** `tsx demo/demo-script.ts` (use `npx`)

### Step 3: Analyze a File
```bash
npm run dev analyze src/core/Agent.ts
```
**NOT** `npm run dev analyze <file-path>` (replace `<file-path>` with actual path)

### Step 4: Start Dashboard
```bash
cd dashboard
npm install
npm run dev
```
**NOT** `cd dashboard && npm install && npm run dev` from home directory

### Step 5: VS Code Extension
```bash
cd vscode-extension
npm install
npm run compile
```

---

## Quick Test

Run this to verify everything:
```bash
cd /Users/vinaytripathi/Documents/QA\ Monster
./test-quick.sh
```

---

## What Was Wrong

1. ❌ You were in `~` (home directory) instead of `QA Monster`
2. ❌ Used `tsx` directly instead of `npx tsx`
3. ❌ Used literal `<file-path>` instead of actual file path
4. ❌ Tried to `cd` to directories that don't exist from home directory

## What's Fixed

1. ✅ All directories exist in `/Users/vinaytripathi/Documents/QA Monster`
2. ✅ Use `npx tsx` to run TypeScript files
3. ✅ Use actual file paths (e.g., `src/core/Agent.ts`)
4. ✅ Always `cd` to QA Monster directory first

---

## Example: Complete Workflow

```bash
# 1. Go to project
cd /Users/vinaytripathi/Documents/QA\ Monster

# 2. Verify build
npm run build

# 3. Run demo
npx tsx demo/demo-script.ts

# 4. Analyze a file
npm run dev analyze src/core/Agent.ts

# 5. View results
cat qa-output/qa-output.json | head -50
```
