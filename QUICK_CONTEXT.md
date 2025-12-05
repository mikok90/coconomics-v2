# Quick Context (For Claude)

## Current State ⏳
- **Fresh deployment in progress** (commit 9498b2f)
- Production URL: https://coconomics-v2.vercel.app (use EXACT URL, not preview!)
- Backend: https://coconomics-backend.onrender.com
- Local dev server: http://localhost:3003 (ports 3000-3002 in use)

## Working Directory
`C:\Users\mike\Downloads\coconomics-deploy`

## What Just Got Added (Latest Session - 2025-12-05)
1. ✅ Subdivided Technology sector into 6 granular categories:
   - Semiconductors (NVDA, AMD, INTC, etc.)
   - Cloud Infrastructure (MSFT, GOOGL, ORCL, etc.)
   - AI & Quantum (PLTR, AI, IONQ, RGTI, etc.)
   - Software & SaaS (CRM, ADBE, NOW, etc.)
   - Hardware & Devices (AAPL, etc.)
   - E-Commerce & Digital (AMZN, META, NFLX, UBER, etc.)
2. ✅ Moved Add Stock button ABOVE Portfolio Performance chart
3. ✅ Added validation for invalid stock symbols (1-5 letters, error popup)
4. ✅ Fixed duplicate stock symbols in sector mapping
5. ✅ Force redeployed to bust Vercel cache (empty commit)

## Latest Commits
- **9498b2f** - Force Vercel redeploy - bust all caches (CURRENT)
- **5586a31** - Add granular tech sectors, move Add Stock button, add invalid symbol validation
- **b9638bb** - Fix duplicate stock symbols in sector mapping

## Critical Rules
1. ⚠️ NEVER copy files between folders
2. ⚠️ Test locally before pushing
3. ⚠️ Use production URL for phone testing (NOT preview URLs!)
4. ⚠️ Vercel env vars: Production ONLY
5. ⚠️ If localhost freezes: Clean .next cache with `cmd //c "if exist .next rd /s /q .next"`

## Current Issue & Testing
- Dev server cache was corrupted (causing localhost to freeze)
- Fixed by cleaning .next and starting fresh dev server
- Forced fresh Vercel deployment to bust production cache
- **TESTING NEEDED:**
  1. Check localhost:3003 works with changes
  2. Wait for Vercel deployment (9498b2f) to show "Ready"
  3. Test on phone in Chrome Incognito first
  4. If working, reinstall PWA fresh

## Next Session Tasks
- Test that production shows all changes after cache-busting deploy
- Implement collapsible/expandable stock cards (deferred from this session)

## Quick Links
- Full details: Read PROJECT_CONTEXT.md
- Git history: `git log --oneline -10`
