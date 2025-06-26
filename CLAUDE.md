# EconIndicatorDaily - Project Instructions

## Project Overview
EconIndicatorDaily is a freemium platform that provides plain English explanations of economic indicators with investment implications. The system follows a 4-layer architecture with automated daily updates and user-facing dashboard.

## Tech Stack
- **Backend**: Node.js + TypeScript + Express.js + Prisma + PostgreSQL
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Infrastructure**: Vercel (frontend) + Railway/Render (backend)
- **APIs**: FRED, Alpha Vantage, World Bank, Bureau of Labor Statistics

## Development Commands
```bash
# Backend development
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate   # Run database migrations
npx prisma studio    # Open Prisma Studio
```

## Project Structure Guidelines
- `/backend` - Express.js API server
- `/frontend` - Next.js application
- `/shared` - Shared TypeScript types and utilities
- `/docs` - Project documentation
- `/scripts` - Deployment and utility scripts

## Key Implementation Notes
- **Rate Limiting**: Smart caching with 24-hour cache for daily indicators
- **Freemium Model**: 5 indicators free, 50+ indicators pro ($9.99/month)
- **Data Sources**: Multiple API fallbacks to prevent downtime
- **Authentication**: NextAuth.js for user management
- **Background Jobs**: Bull Queue for data processing

## Phase 1 MVP Checklist
- [x] Setup development environment and database
- [x] Implement FRED API integration with basic caching
- [x] Create simple dashboard with 5 core indicators
- [x] Implement Alpha Vantage API integration for market data
- [x] Build user authentication and basic subscription logic
- [x] Implement weekly indicators for better free user experience
- [x] Fix upgrade flow UI/UX issues
- [x] Complete upgrade functionality with session refresh
- [ ] Deploy basic version with weekly email functionality

## Current Status
✅ **Completed:**
- Backend: Express.js + TypeScript + Prisma setup
- Database: PostgreSQL schema with all core tables
- FRED API: Service integration with 10 economic indicators including 4 weekly indicators
- Alpha Vantage API: Service integration with 5 market indicators (SPY, VTI, QQQ, DIA, VXX)
- Frontend: Next.js + TypeScript + Tailwind dashboard with NextAuth.js authentication
- Dashboard: Premium indicator cards with frequency-based prioritization for free users
- User System: Complete subscription management with working upgrade/downgrade functionality
- Weekly Indicators: Initial Claims, Continuing Claims, Commercial Paper, Bank Assets
- Upgrade Flow: Full end-to-end upgrade from free to Pro with real-time session refresh

## Key Features Working
🎯 **Freemium Model**:
- Free users: 5 indicators prioritized by frequency (daily/weekly first)
- Pro users: All 15+ indicators with unlimited access
- Real-time upgrade flow with immediate access

📊 **Data Sources**:
- FRED API: 10 economic indicators (4 weekly, 5 monthly, 1 quarterly)
- Alpha Vantage API: 5 market indicators (daily updates)
- Smart frequency prioritization for free users

🔐 **Authentication & Subscriptions**:
- NextAuth.js with demo credentials
- Complete user management with subscription tiers
- Working upgrade/downgrade with session refresh
- Backend API for subscription management

🎨 **User Experience**:
- Modern responsive dashboard with premium styling
- Subtle upgrade prompts (no aggressive "LIMIT REACHED" cards)
- Frequency-based indicator sorting for better free user experience
- Real-time session updates after subscription changes

## Next Steps
1. **Email System**: Implement weekly email notifications for Pro users
2. **Alpha Vantage Optimization**: Handle API rate limits and optimize usage
3. **Testing**: Complete comprehensive end-to-end testing
4. **Deployment**: Deploy to production environment with environment variables
5. **Analytics**: Add user engagement and conversion tracking

## Getting Started
```bash
# Backend setup
cd backend
npm install
# Set up .env file with DATABASE_URL, FRED_API_KEY, and ALPHA_VANTAGE_API_KEY
npx prisma migrate dev
npm run dev

# Frontend setup  
cd frontend
npm install
npm run dev
```

## Security & Best Practices
- Use environment variables for all API keys
- Implement rate limiting for external APIs
- Validate all user inputs
- Use HTTPS in production
- Regular security updates for dependencies

## Deployment
- Frontend: Vercel with automatic deployments from main branch
- Backend: Railway/Render with environment variable configuration
- Database: PostgreSQL hosted service with automated backups

## Where to get API keys
High Priority - Free Financial APIs:

  1. Finnhub - Real-time stocks, forex, crypto, economic data
    - 🔗 Register: https://finnhub.io/register
    - Free Tier: 60 API calls/minute, comprehensive data
    - Best for: Real-time market data, crypto, forex
  2. Financial Modeling Prep (FMP) - Commodities, bonds, institutional data
    - 🔗 Register: https://site.financialmodelingprep.com/login
    - Free Tier: 250 requests/day, extensive financial data
    - Best for: Commodities, bonds, company fundamentals
  3. EODHD - 150,000+ tickers globally
    - 🔗 Register: https://eodhd.com/register
    - Free Tier: 20 requests/day, end-of-day data
    - Best for: International markets, ETFs

  Medium Priority - Government APIs (No Keys Needed):

  4. U.S. Census Bureau - No API key required
    - 🔗 Documentation: https://www.census.gov/data/developers/data-sets.html
    - Free: Unlimited requests, economic indicators
  5. European Central Bank - No API key required
    - 🔗 API Docs: https://data.ecb.europa.eu/help/api/overview
    - Free: Unlimited, eurozone economic data
  6. IMF Data - No API key required
    - 🔗 API Docs: https://datahelp.imf.org/knowledgebase/articles/667681
    - Free: Global macroeconomic data

## Project Memories
- Added .env secret support