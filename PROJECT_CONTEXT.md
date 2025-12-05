# Coconomics V2 - Project Context

## Project Overview
Professional portfolio management application with Markowitz optimization, real-time stock prices, and comprehensive transaction tracking.

## Current Deployment Setup

### Frontend
- **Platform:** Vercel (deployed as PWA)
- **Production URL:** https://coconomics-v2.vercel.app (or your custom domain)
- **Framework:** Next.js 14 with TypeScript
- **PWA Enabled:** Yes (can be installed on phone/desktop with custom "C" logo)
- **Environment Variables (Vercel - Production Only):**
  - `NEXT_PUBLIC_API_URL=https://coconomics-backend.onrender.com`
  - ⚠️ Only set for Production (not Preview/Development) to avoid phone login issues

### Backend
- **Platform:** Render.com
- **URL:** https://coconomics-backend.onrender.com
- **Framework:** NestJS with TypeORM
- **Database:** PostgreSQL (port 1234 locally, managed on Render)
- **Port:** 3001
- **Auto-Deploy:** Connected to GitHub master branch

### Local Development
- **Working Directory:** `C:\Users\mike\Downloads\coconomics-deploy`
- **Frontend Local:** `npm run dev` in `/frontend` (port 3000)
- **Backend Local:** `npm run start:dev` in `/backend` (port 3001)
- **Database:** PostgreSQL on localhost:1234
- **Local IP:** 192.168.1.3 (may change)

### GitHub Repository
- **Repo:** https://github.com/mikok90/coconomics-v2.git
- **Branches:** main (local) → master (remote)
- **Latest Commit:** 842ce8c - "Restore complete working page.tsx with deposit/withdraw buttons"

## Current Working Features ✅

### 1. Authentication System
- Login/Signup with JWT tokens
- Persistent auth state with localStorage
- Protected routes
- **Status:** ✅ WORKING - Stocks persist on refresh!

### 2. Portfolio Dashboard
- Real-time stock positions with live prices via Finnhub
- Portfolio value calculation (cash + stocks)
- Cash balance tracking
- Total profit/loss calculation
- **Status:** ✅ WORKING PERFECTLY

### 3. Cash Management (JUST RESTORED!)
- ✅ Deposit cash button
- ✅ Withdraw cash button
- ✅ Transaction history modal
- Modal-based UI with beautiful animations
- **Status:** ✅ WORKING

### 4. Stock Management
- Add/Buy stocks with quantity and price
- Sell stocks (partial or full) with confirmation
- Delete positions with confirmation
- Real-time price updates every 30 seconds
- Custom modals for all operations
- **Status:** ✅ WORKING

### 5. Charts & Analytics (PER STOCK)
- Mini price charts with multiple timeframes (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y)
- Interactive hover tooltips showing price and date
- Grid lines with price labels
- **Status:** ✅ WORKING

### 6. Rule of 40 (PER STOCK)
- Revenue growth percentage
- Profit margin percentage
- Rule of 40 score calculation
- Rating (Excellent/Good/Fair/Poor)
- **Status:** ✅ WORKING (backend format fixed)

### 7. Rebalancing Algorithms (PER STOCK)
- Value Averaging algorithm
- Loss Averaging algorithm
- Actionable recommendations (BUY/HOLD)
- **Status:** ✅ WORKING

### 8. PWA Features
- Custom "C" logo (not Vercel "V")
- Installable on mobile devices
- Offline support via service worker
- **Status:** ✅ WORKING

## Features to Add Now (Without Breaking Anything!)

### 🎯 Feature 1: Sector Allocation Pie Chart
- **What:** Colorful pie chart showing portfolio diversification by sector
- **Where:** Below the main portfolio card, above stock list
- **Component:** Already created at `/frontend/app/components/SectorAllocationChart.tsx`
- **Status:** ⏳ NEEDS TO BE ADDED

### 🎯 Feature 2: Portfolio Performance Chart
- **What:** Line chart showing portfolio value over time
- **Where:** Below the main portfolio card, above sector chart
- **Component:** Already exists at `/frontend/app/components/PortfolioPerformanceChart.tsx`
- **Status:** ⏳ NEEDS TO BE ADDED

### 🎯 Feature 3: Loading Spinners
- **What:** Visual feedback during all async operations
- **Where:** Everywhere (login, buy, sell, deposit, withdraw, etc.)
- **Component:** Already exists at `/frontend/app/components/LoadingSpinner.tsx`
- **Status:** ⏳ NEEDS TO BE ADDED

## API Endpoints (Backend)

### Authentication
- `POST /auth/signup` - Create new user
- `POST /auth/login` - Login user

### Portfolio
- `GET /portfolio/me` - Get user portfolio summary
- `GET /portfolio/me/positions` - Get all positions
- `GET /portfolio/me/live-prices` - Get positions with real-time prices
- `POST /portfolio/me/add-position` - Buy stock
- `POST /portfolio/position/:id/sell` - Sell stock
- `DELETE /portfolio/position/:id` - Delete position
- `GET /portfolio/me/transactions` - Get transaction history
- `DELETE /portfolio/me/transactions` - Clear all transactions
- `POST /portfolio/me/deposit` - Deposit cash
- `POST /portfolio/me/withdraw` - Withdraw cash
- `GET /portfolio/me/performance` - Get portfolio performance over time
- `POST /portfolio/me/snapshot` - Create portfolio snapshot

### Stock Data (via Finnhub API)
- `GET /portfolio/stock/:symbol/quote` - Real-time quote
- `GET /portfolio/stock/:symbol/chart?range=1d` - Historical chart data
- `GET /portfolio/stock/:symbol/rule-of-40` - Rule of 40 metrics
- `GET /portfolio/position/:id/rebalancing` - Rebalancing recommendations

## Important File Locations

### Frontend Key Files
- `/frontend/app/page.tsx` - Main dashboard (COMPLETE VERSION)
- `/frontend/app/auth-context.tsx` - Auth state management
- `/frontend/app/login/page.tsx` - Login page
- `/frontend/app/signup/page.tsx` - Signup page
- `/frontend/app/layout.tsx` - Root layout with PWA config
- `/frontend/.env.local` - Local environment variables (not in git)
- `/frontend/next.config.js` - PWA configuration
- `/frontend/public/manifest.json` - PWA manifest
- `/frontend/public/icon.svg` - Custom "C" logo

### Frontend Components (Already Created!)
- `/frontend/app/components/LoadingSpinner.tsx` - Loading animations
- `/frontend/app/components/PortfolioPerformanceChart.tsx` - Performance over time
- `/frontend/app/components/SectorAllocationChart.tsx` - Sector pie chart
- `/frontend/app/components/TransactionHistory.tsx` - Transaction list

### Backend Key Files
- `/backend/src/main.ts` - Entry point
- `/backend/src/auth/` - Authentication module
- `/backend/src/portfolio/portfolio.controller.ts` - API endpoints
- `/backend/src/portfolio/portfolio.service.ts` - Business logic
- `/backend/src/stock-price.service.ts` - Finnhub integration
- `/backend/.env` - Backend environment variables (not in git)
- `/backend/schema.sql` - Database schema

## Development Workflow

### Making Changes (IMPORTANT!)
1. **ALWAYS test locally first** before pushing
2. Edit code in `/frontend` or `/backend`
3. Test locally (both servers running on localhost)
4. Commit changes: `git add . && git commit -m "message"`
5. Push to GitHub: `git push origin main:master`
6. **Backend:** Auto-deploys to Render (wait 2-3 minutes)
7. **Frontend:** Auto-deploys to Vercel (wait 1-2 minutes)

### Testing Procedure
1. **PC Browser:** Test on `http://localhost:3000`
2. **Phone:** Use Vercel PRODUCTION URL (not preview URL!)
3. **Clear cache** on phone if changes don't appear
4. **Hard refresh** browser if needed

### Environment Variables
- **Vercel:** Production only, set in dashboard → Settings → Environment Variables
- **Render:** Set in dashboard → Environment
- **Local:** Use `.env.local` (frontend) or `.env` (backend)

## Critical Lessons Learned

### ⚠️ NEVER Do This:
1. ❌ Don't copy incomplete files between folders
2. ❌ Don't test only on preview URLs (they may not have env vars)
3. ❌ Don't forget to add imports when adding components
4. ❌ Don't push without testing locally first
5. ❌ Don't forget to deploy backend to Render after backend changes

### ✅ ALWAYS Do This:
1. ✅ Test locally before pushing
2. ✅ Use production URL for phone testing
3. ✅ Check that all components are imported
4. ✅ Verify authentication works before adding features
5. ✅ Keep PROJECT_CONTEXT.md updated

## Current Status (Session End 2025-12-05)

### What's Working Perfectly:
- ✅ Authentication (login/signup)
- ✅ Stocks persist on refresh
- ✅ Deposit/Withdraw cash buttons
- ✅ Transaction history
- ✅ Buy/Sell stocks
- ✅ Real-time prices
- ✅ Mini charts per stock
- ✅ Rule of 40 per stock
- ✅ Rebalancing algorithms per stock
- ✅ PWA with custom "C" logo
- ✅ All deployed to Production

### What Needs to Be Added (Next Session):
- ⏳ Sector Allocation Pie Chart
- ⏳ Portfolio Performance Chart (over time)
- ⏳ Loading Spinners (visual feedback)

### How to Add Features Without Breaking:
1. Read this file first
2. Import the component at the top of page.tsx
3. Add the component in the right place in the JSX
4. Test locally
5. Commit and push
6. Test on production URL

---
**Last Updated:** 2025-12-05 Evening
**Everything Working:** YES ✅
**Ready for Next Features:** YES ✅
