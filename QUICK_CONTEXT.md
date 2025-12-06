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

## Database Entities (TypeORM)
**CRITICAL:** ALL entities MUST be registered in `app.module.ts` entities array:
```typescript
entities: [User, Portfolio, Asset, Position, PriceHistory, RebalanceHistory,
           OptimizationResult, Transaction, PortfolioSnapshot]
```
**Forgetting to register = "No metadata found" error**

## API Response Format
- **Backend:** Returns snake_case (revenue_growth_percent, profit_margin_percent)
- **Frontend:** Expects camelCase (revenueGrowth, profitMargin)
- **Solution:** Transform in controller before returning to frontend

## Stock Validation
- **Invalid stock:** Finnhub returns price = 0
- **Check:** Throw error if `quote.price === 0` in `stock-price.service.ts`
- **Message:** "Invalid stock symbol: {symbol}"

## Common Bugs to Avoid
1. **Forgetting entity registration** → Always update app.module.ts
2. **Format mismatch** → Transform snake_case to camelCase in controllers
3. **Cash balance logic** → Only change on SELL/DEPOSIT/WITHDRAW (NOT on BUY/REMOVE)
4. **Cost basis tracking** → Update totalDeposits on DEPOSIT and REMOVE operations
5. **Reset completeness** → Clear snapshots AND totalDeposits/totalWithdrawals

## Testing Checklist Before Deploy
- [ ] Backend compiles without errors
- [ ] Frontend builds successfully
- [ ] Cash balance only changes on SELL/DEPOSIT/WITHDRAW
- [ ] P/L calculation: Current Value - (totalDeposits - totalWithdrawals)
- [ ] All new entities registered in app.module.ts
- [ ] Response format matches frontend expectations
- [ ] Push to BOTH branches (main + master)

## Quick Links
- Backend repo: https://github.com/mikok90/coconomics-v2
- Vercel dashboard: https://vercel.com
- Render dashboard: https://render.com
