# Quick Context (For Claude)

## Working Directory
`C:\Users\mike\Downloads\coconomics-deploy`

## What This App Is
**Coconomics V2** - Portfolio management web app for tracking stock investments, performance, and analytics.

## Tech Stack
- **Backend:** NestJS + TypeORM + PostgreSQL (deployed on Render)
- **Frontend:** Next.js 14 + React + TailwindCSS (deployed on Vercel)
- **APIs:** Finnhub (stock quotes), Yahoo Finance (charts), Financial Modeling Prep (fundamentals)
- **Database:** PostgreSQL with entities: User, Portfolio, Position, Asset, Transaction, PortfolioSnapshot

## Git Branch Strategy
- **Local:** `main` branch
- **Remote has TWO branches:**
  - `origin/main` - Render backend watches THIS
  - `origin/master` - Vercel frontend watches THIS
- **CRITICAL:** Must push to BOTH branches:
  ```bash
  git push origin main:main    # For Render backend
  git push origin main:master  # For Vercel frontend
  ```

## Deployment
- **Frontend (Vercel):** https://coconomics-v2.vercel.app
  - Watches: `origin/master` branch
  - Auto-deploys on push
  - Env var: `NEXT_PUBLIC_API_URL` points to Render backend

- **Backend (Render):** coconomics-backend-new.onrender.com
  - Watches: `origin/main` branch
  - Root Directory: `backend`
  - Build: `npm install --include=dev && npm run build`
  - Start: `npm run start:prod`
  - Database: PostgreSQL (via DATABASE_URL env var)

## Key Architecture Patterns

### Portfolio Operations
1. **BUY Stock:** Adds position, does NOT change cash balance
2. **SELL Stock:** Adds proceeds to cash, updates/deletes position
3. **REMOVE Stock:** Deletes position, adjusts totalDeposits (cost basis), NO cash refund
4. **DEPOSIT:** Increases cash + totalDeposits
5. **WITHDRAW:** Decreases cash + totalWithdrawals

### Profit/Loss Calculation
- Formula: `Current Portfolio Value - (totalDeposits - totalWithdrawals)`
- Cost basis tracked via `totalDeposits` and `totalWithdrawals` in Portfolio entity
- Snapshots created after: BUY, SELL, DEPOSIT, WITHDRAW, REMOVE

### Cash Balance Rules
Cash balance ONLY changes on:
- SELL (adds proceeds)
- DEPOSIT (adds cash)
- WITHDRAW (subtracts cash)

Cash balance NEVER changes on:
- BUY (stocks are separate from cash)
- REMOVE (mistake correction, no refund)

## Important Files

### Backend (`backend/src/`)
- `app.module.ts` - TypeORM config, entity registration
- `portfolio.service.ts` - Core business logic (BUY, SELL, REMOVE, DEPOSIT, WITHDRAW)
- `portfolio.controller.ts` - API endpoints
- `stock-price.service.ts` - External API calls (Finnhub, Yahoo, FMP)
- `entities.ts` - Database entities (User, Portfolio, Position, etc.)

### Frontend (`frontend/app/`)
- `page.tsx` - Main portfolio page
- `components/PortfolioPerformanceChart.tsx` - Performance chart with Reset button
- `components/SectorAllocationChart.tsx` - Sector breakdown (includes granular tech sectors)
- `auth-context.tsx` - Authentication state management

## Critical Rules
1. ⚠️ **ALWAYS push to BOTH branches:** main (Render) and master (Vercel)
2. ⚠️ NEVER copy files between folders
3. ⚠️ Test locally before pushing (backend on :3001, frontend on :3003)
4. ⚠️ Use production URL for phone testing (NOT preview URLs)
5. ⚠️ Check BOTH Vercel AND Render deployment status after pushing
6. ⚠️ If localhost freezes: Clean .next cache with `cmd //c "if exist .next rd /s /q .next"`

## Local Development
- **Backend:** `cd backend && npm run start:dev` (port 3001)
- **Frontend:** `cd frontend && npm run dev` (port 3003)
- **Database:** PostgreSQL (connection via DATABASE_URL)

## Key Features
1. **Stock Management:** Add, sell, remove positions
2. **Cash Management:** Deposit, withdraw with transaction history
3. **Performance Tracking:** Time-series snapshots, P/L calculation
4. **Sector Allocation:** Granular breakdown (6 tech subcategories)
5. **Rule of 40:** SaaS company health metric
6. **Real-time Prices:** Live stock quotes + mini charts

## Reset Performance Feature
- **Endpoint:** `DELETE /portfolio/me/performance`
- **What it does:** Deletes all snapshots + resets totalDeposits/totalWithdrawals to 0
- **UI:** Red "Reset Chart" button next to Deposit/Withdraw/History buttons
- **Use case:** Clear corrupted data and start fresh

## Currency
- **Display:** USD ($)
- **Formatting:** `en-US` locale, no decimals for currency display

## Quick Links
- Backend repo: https://github.com/mikok90/coconomics-v2
- Vercel dashboard: https://vercel.com
- Render dashboard: https://render.com
