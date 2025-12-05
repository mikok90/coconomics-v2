# Quick Context (For Claude)

## Current State ✅ RESOLVED
- **Frontend (Vercel):** ✅ WORKING - All changes deployed
- **Backend (Render):** ✅ FIXED - New service with correct code
- Production URL: https://coconomics-v2.vercel.app
- Backend: NEW service (coconomics-backend-new.onrender.com or similar)
- Local dev: Frontend on :3003, Backend on :3001

## 🎉 Deployment Issue RESOLVED

**THE PROBLEM:**
- Old Render service was watching WRONG repository: `coconomics-backend`
- Our code is in: `coconomics-v2`
- Result: Render kept deploying ancient code (f59afcf from Dec 4)

**THE SOLUTION:**
- Created NEW Render service pointing to correct repo: `coconomics-v2`
- Configuration:
  - Repository: `mikok90/coconomics-v2`
  - Branch: `main`
  - Root Directory: `backend`
  - Build Command: `npm install --include=dev && npm run build`
  - Start Command: `npm run start:prod`
- Updated Vercel env var `NEXT_PUBLIC_API_URL` to new backend URL
- Redeployed Vercel without cache to pick up new backend

**CURRENT STATUS:**
- ✅ Backend deploys from: coconomics-v2 repo, main branch, commit 7b32fde
- ✅ Frontend deploys from: coconomics-v2 repo, master branch
- ✅ Both services connected and working
- ⏳ User testing invalid stock validation and performance chart

## Working Directory
`C:\Users\mike\Downloads\coconomics-deploy`

## What Got Added This Session (2025-12-05 Evening)

### Frontend Changes (✅ DEPLOYED & WORKING)
1. ✅ Subdivided Technology sector into 6 granular categories:
   - Semiconductors (NVDA, AMD, INTC, etc.)
   - Cloud Infrastructure (MSFT, GOOGL, ORCL, etc.)
   - AI & Quantum (PLTR, AI, IONQ, RGTI, etc.)
   - Software & SaaS (CRM, ADBE, NOW, etc.)
   - Hardware & Devices (AAPL, etc.)
   - E-Commerce & Digital (AMZN, META, NFLX, UBER, etc.)
2. ✅ Moved Add Stock button ABOVE Portfolio Performance chart
3. ✅ Fixed duplicate stock symbols in sector mapping
4. ✅ Added frontend validation (1-5 letters regex)

### Backend Changes (❌ NOT YET DEPLOYED)
1. ❌ Invalid stock validation in stock-price.service.ts:
   - Rejects stocks with price=0 (Finnhub returns 0 for invalid symbols)
   - Throws error: "Invalid stock symbol: {symbol}"
2. ❌ Removed silent error catching in portfolio.service.ts:
   - addPosition() now properly throws errors for invalid stocks
3. ❌ Auto-create performance snapshots on ALL portfolio changes:
   - After buying stock
   - After selling stock
   - After depositing cash
   - After withdrawing cash
   - Portfolio performance chart will populate automatically

## Latest Commits (Both Branches Now Synced)
- **f186add** - Fix portfolio performance algorithm for REMOVE operations (LATEST)
- **f8ba5a2** - Fix Remove button and Portfolio Performance profit/loss calculation
- **75b9b20** - Fix portfolio performance chart and Rule of 40 display
- **77aa5a3** - Delete confirmation fixes
- **00702ce** - Fix invalid stock validation and portfolio performance tracking

## Git Branch Strategy
- **Local:** `main` branch
- **Remote has TWO branches:**
  - `origin/main` - Render watches THIS
  - `origin/master` - Vercel watches THIS
- **Previous workflow:** `git push origin main:master` (only updated master)
- **New workflow:** Must push to BOTH branches:
  ```bash
  git push origin main:main    # For Render backend
  git push origin main:master  # For Vercel frontend
  ```

## Critical Rules
1. ⚠️ **ALWAYS push to BOTH branches:** main (Render) and master (Vercel)
2. ⚠️ NEVER copy files between folders
3. ⚠️ Test locally before pushing
4. ⚠️ Use production URL for phone testing (NOT preview URLs!)
5. ⚠️ Vercel env vars: Production ONLY
6. ⚠️ If localhost freezes: Clean .next cache with `cmd //c "if exist .next rd /s /q .next"`
7. ⚠️ Check BOTH Vercel AND Render deployment status after pushing

## Files Modified This Session (Dec 6, 2025)

### Previous Session (Dec 5)
- `backend/src/stock-price.service.ts` - Added price=0 validation
- `backend/src/portfolio.service.ts` - Added createSnapshot calls, removed error catching
- `frontend/app/components/SectorAllocationChart.tsx` - Granular tech sectors
- `frontend/app/page.tsx` - Button position, frontend validation, delete confirmation

### Current Session Fixes (Dec 6)
- `backend/src/app.module.ts` - Added PortfolioSnapshot entity registration (CRITICAL FIX)
- `backend/src/portfolio.controller.ts` - Fixed Rule of 40 response format, added DELETE /me/performance endpoint
- `backend/src/portfolio.service.ts` - Fixed deletePosition to adjust totalDeposits (cost basis), added deleteAllSnapshots()
- `frontend/app/components/PortfolioPerformanceChart.tsx` - Fixed profit/loss calculation logic

## Current Deployment Status

### Vercel (Frontend) ✅
- **Status:** DEPLOYED & WORKING
- **Latest Commit:** 77aa5a3 - Delete confirmation fixes
- **User Confirmed:** Granular sectors, button position, valid stock validation all working

### Render (Backend) ✅
- **Status:** WORKING
- **New Service:** coconomics-backend-new (correct repo: coconomics-v2)
- **Latest Deploy:** f186add
- **All Issues FIXED:**
  - ✅ Portfolio Performance chart (entity registration)
  - ✅ Rule of 40 display (response format)
  - ✅ REMOVE operation cost basis (adjusts totalDeposits)
  - ✅ Performance reset endpoint (DELETE /me/performance)

## Issues Fixed This Session (Dec 6)
1. ✅ **Portfolio Performance Chart Empty**
   - **Problem:** PortfolioSnapshot entity not registered in app.module.ts
   - **Symptom:** Backend error "No metadata for PortfolioSnapshot was found"
   - **Fix:** Added PortfolioSnapshot to entities import and TypeORM configuration
   - **Result:** Performance chart will now display snapshots after stock purchases

2. ✅ **Rule of 40 Showing N/A**
   - **Problem:** Backend returning snake_case (revenue_growth_percent), frontend expecting camelCase (revenueGrowth)
   - **Fix:** Transformed response in portfolio.controller.ts getRuleOf40 endpoint
   - **Result:** Rule of 40 metrics now display correctly

3. ✅ **Delete Confirmation Message**
   - **Previous:** Generic "Remove Position" with "Cancel/Confirm" buttons
   - **Now:** "Are you sure you want to remove this stock?" with "No/Yes" buttons

4. ✅ **Remove Button Refunding Money (WRONG)**
   - **Problem:** Clicking "Remove" was adding money back to cash balance
   - **User Expectation:** Remove = forget completely, NO money back (money was already spent)
   - **Fix:** Removed refund logic from deletePosition() - now just deletes position
   - **Result:** Remove = no trace, no refund. Sell = get current market value as cash

5. ✅ **Portfolio Performance Showing Wrong Profit/Loss**
   - **Problem:** Chart compared first snapshot to last snapshot (wrong!)
   - **Example:** Deposit $1000, buy stocks, deposit another $1000 → shows +$1000 profit (wrong)
   - **Fix:** Calculate actual P/L = Current Value - (Total Deposits - Total Withdrawals)
   - **Backend:** Modified getPerformanceData to return totalDeposits and totalWithdrawals
   - **Frontend:** Fixed calculateChange to use correct formula
   - **Result:** Chart now shows ACTUAL profit/loss, accounting for all deposits/withdrawals

6. ✅ **REMOVE Operation Breaking Portfolio Performance (CRITICAL)**
   - **Problem:** Removing stocks didn't adjust cost basis (totalDeposits)
   - **Example:** Deposit $1000, buy stock for $800, REMOVE stock → P/L = $200 - $1000 = -$800 (wrong!)
   - **Expected:** REMOVE should make it as if purchase never happened (P/L = $0)
   - **Fix:** Modified deletePosition() to subtract purchase cost from totalDeposits
   - **Formula:** `totalDeposits = totalDeposits - (quantity * avgBuyPrice)`
   - **Result:** REMOVE now correctly adjusts cost basis (no profit/loss impact)

7. ✅ **Added Portfolio Performance Reset Feature**
   - **Problem:** User had corrupted performance data showing +€4160 after removing all stocks
   - **Fix:** Added DELETE /portfolio/me/performance endpoint
   - **Backend:** Created deleteAllSnapshots() method to clear all snapshots for a portfolio
   - **Result:** Users can now reset performance data and start fresh

## Next Session Tasks
1. ✅ DONE: Fixed Render deployment (created new service)
2. ✅ DONE: Fixed valid stock validation errors
3. ✅ DONE: Fixed portfolio performance chart (entity registration)
4. ✅ DONE: Fixed Rule of 40 display (response format)
5. ✅ DONE: Fixed delete confirmation dialog
6. ✅ DONE: Fixed REMOVE operation to adjust cost basis
7. ✅ DONE: Added portfolio performance reset endpoint
8. 🔜 USER ACTION NEEDED: Reset your portfolio performance using the app or API:
   - **Option 1 (Recommended):** I can add a reset button to the frontend
   - **Option 2:** Call DELETE http://localhost:3001/portfolio/me/performance (with auth token)
   - After reset, performance will start fresh from your next transaction
9. 🔜 TODO: Implement collapsible/expandable stock cards (deferred)
10. 🔜 TODO: Consider deleting old Render service (coconomics-backend) once everything confirmed working

## Quick Links
- Full details: Read PROJECT_CONTEXT.md
- Git history: `git log --oneline -10`
- Check branches: `git branch -a`
