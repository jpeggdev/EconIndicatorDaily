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
- [ ] Build user authentication and basic subscription logic
- [ ] Deploy basic version with weekly email functionality

## Current Status
✅ **Completed:**
- Backend: Express.js + TypeScript + Prisma setup
- Database: PostgreSQL schema with all core tables
- FRED API: Service integration with 5 core indicators (GDP, Unemployment, CPI, Fed Funds, Payrolls)
- Frontend: Next.js + TypeScript + Tailwind dashboard
- Dashboard: Basic indicator cards with data display

## Next Steps
1. **Database Setup**: Create actual PostgreSQL database and run migrations
2. **Authentication**: Implement NextAuth.js for user management
3. **API Keys**: Set up FRED API key for data fetching
4. **Testing**: Test full data flow from FRED → Database → Frontend

## Getting Started
```bash
# Backend setup
cd backend
npm install
# Set up .env file with DATABASE_URL and FRED_API_KEY
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