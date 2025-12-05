# Coconomics V2 - Project Context

## Project Overview
Professional portfolio management application with Markowitz optimization, real-time stock prices, and comprehensive transaction tracking.

## Current Deployment Setup

### Frontend
- **Platform:** Vercel (deployed as PWA)
- **URL:** [Your Vercel URL]
- **Framework:** Next.js 14 with TypeScript
- **PWA Enabled:** Yes (can be installed on phone/desktop)
- **Environment Variables (Vercel - Production Only):**
  - `NEXT_PUBLIC_API_URL=https://coconomics-backend.onrender.com`
  - ⚠️ Only set for Production (not Preview/Development) due to phone login issues

### Backend
- **Platform:** Render.com
- **URL:** https://coconomics-backend.onrender.com
- **Framework:** NestJS with TypeORM
- **Database:** PostgreSQL (port 1234 locally, managed on Render)
- **Port:** 3001

### Local Development
- **Working Directory:** `C:\Users\mike\Downloads\coconomics-deploy`
- **Frontend Local:** `npm run dev` in `/frontend` (port 3000)
- **Backend Local:** `npm run start:dev` in `/backend` (port 3001)
- **Database:** PostgreSQL on localhost:1234

### GitHub Repository
- **Repo:** https://github.com/mikok90/coconomics-v2.git
- **Branches:** main (local) → master (remote)
- **Latest Commit:** 9fee4bf - "Trigger Vercel redeploy with updated backend URL"

## Key Features Implemented

### ✅ Completed Features
1. **Authentication System**
   - Login/Signup with JWT tokens
   - Persistent auth state with localStorage
   - Protected routes

2. **Portfolio Dashboard**
   - Real-time stock positions with live prices
   - Portfolio value calculation
   - Cash balance tracking
   - Transaction history (moved to top of page)
   - Portfolio performance chart over time

3. **Stock Management**
   - Add/Buy stocks with quantity and price
   - Sell stocks (partial or full)
   - Delete positions
   - Real-time price updates via Finnhub API

4. **Transactions System**
   - Complete transaction history with types (BUY, SELL, DEPOSIT, WITHDRAW)
   - Deposit/Withdraw cash functionality
   - Clear all transactions feature

5. **Analytics**
   - Portfolio snapshots tracking value over time
   - Performance chart showing portfolio growth
   - **Sector allocation pie chart** (REPORTED MISSING - needs investigation)

6. **UI/UX Improvements**
   - Loading spinners on all actions
   - Black/white minimalist design
   - Responsive layout
   - PWA support for mobile installation

## Known Issues & Fixes Needed

### 🔴 CRITICAL ISSUES (Current Session)
1. **Sector Pie Chart Not Showing**
   - User reports sector allocation chart is missing
   - Need to investigate if component exists and why it's not rendering

2. **Stocks Disappear on Page Refresh**
   - All bought stocks vanish when page is refreshed
   - Likely data fetching or state persistence issue
   - Need to check API calls and data loading on mount

### Previous Issues (Resolved)
- ❌ Login failed with "failed to fetch" → Fixed by starting backend server
- ❌ Hardcoded localhost URLs → Fixed by using environment variables
- ❌ Phone couldn't login → Fixed by setting env var only in Production

## API Endpoints (Backend)

### Authentication
- `POST /auth/signup` - Create new user
- `POST /auth/login` - Login user

### Portfolio
- `GET /portfolio/me` - Get user portfolio summary
- `GET /portfolio/me/positions` - Get all positions
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
- Real-time quotes
- Historical charts
- Stock recommendations

## Important File Locations

### Frontend Key Files
- `/frontend/app/page.tsx` - Main dashboard
- `/frontend/app/auth-context.tsx` - Auth state management
- `/frontend/app/login/page.tsx` - Login page
- `/frontend/app/signup/page.tsx` - Signup page
- `/frontend/.env.local` - Local environment variables (not in git)
- `/frontend/next.config.js` - PWA configuration

### Backend Key Files
- `/backend/src/main.ts` - Entry point
- `/backend/src/auth/` - Authentication module
- `/backend/src/portfolio/` - Portfolio business logic
- `/backend/.env` - Backend environment variables (not in git)
- `/backend/schema.sql` - Database schema

## Development Workflow

### Making Changes
1. Edit code in `/frontend` or `/backend`
2. Test locally (both servers running)
3. Commit changes: `git add . && git commit -m "message"`
4. Push to GitHub: `git push origin main:master`
5. Vercel auto-deploys from GitHub (wait 1-2 minutes)

### Environment Variables Changes
- **Vercel:** Must update manually in dashboard → Settings → Environment Variables
- **Local:** Update `.env.local` (frontend) or `.env` (backend)

### Database Changes
1. Update `schema.sql` if needed
2. Run migrations with `node run-migration.js` (backend)

## Notes for Future Sessions
- Always check if backend is running when "failed to fetch" errors occur
- Vercel env vars are PRODUCTION ONLY (phone login issue)
- Local IP: 192.168.1.3 (may change)
- Both dev servers must run for local testing
- PWA requires HTTPS in production (Vercel provides this)

## Current State
- ✅ Backend running on Render (public URL)
- ✅ Frontend deployed on Vercel (accessible as PWA)
- ✅ GitHub up to date
- 🔴 Need to fix: Sector chart missing
- 🔴 Need to fix: Stocks disappearing on refresh

---
Last Updated: 2025-12-05
