# EconIndicatorDaily

A freemium platform that provides plain English explanations of economic indicators with investment implications.

## 🎯 Project Overview

EconIndicatorDaily transforms complex economic data into actionable insights for individual investors. The platform offers automated daily updates, trend analysis, and investment implications in an accessible format.

## 🏗️ Architecture

- **Data Ingestion Layer**: Automated API fetching with rate limiting
- **Processing Layer**: Data analysis and trend detection  
- **Content Layer**: Template-based explanations and visualizations
- **Delivery Layer**: User-facing website with freemium features

## 🛠️ Tech Stack

- **Backend**: Node.js + TypeScript + Express.js + Prisma + PostgreSQL
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Infrastructure**: Vercel (frontend) + Railway/Render (backend)
- **APIs**: FRED, Alpha Vantage, World Bank, Bureau of Labor Statistics

## 🚀 Getting Started

See `CLAUDE.md` for detailed development instructions and project setup.

## 📊 Features

### Free Tier
- 5 key economic indicators with explanations
- Basic trend visualization (3-month view)
- Weekly email digest
- Mobile-responsive dashboard

### Pro Tier ($9.99/month)  
- Daily updates for 50+ indicators
- Investment implications and sector analysis
- Predictive alerts and notifications
- Historical data (5+ years)
- Portfolio impact assessments
- Custom indicator tracking
- API access

## 📁 Project Structure

```
/backend     - Express.js API server
/frontend    - Next.js application  
/shared      - Shared TypeScript types
/docs        - Project documentation
/scripts     - Deployment utilities
```

## 🔧 Development

Refer to `CLAUDE.md` for complete development setup and commands.

## 📈 Roadmap

See `DESIGN.md` for detailed implementation phases and timeline.