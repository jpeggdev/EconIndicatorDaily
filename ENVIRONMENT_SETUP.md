# Environment Setup Guide

This guide covers setting up environment variables for both development and production environments.

## Quick Start

1. **Backend Setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

## Required Environment Variables

### Backend (.env)

#### Core API Keys (Required)
```env
# Get from https://fred.stlouisfed.org/docs/api/api_key.html
FRED_API_KEY="your_fred_api_key_here"

# Get from https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY="your_alpha_vantage_api_key_here"

# Get from https://www.bls.gov/developers/api_signature_v2.htm
BLS_API_KEY="your_bls_api_key_here"
```

#### Database
```env
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/econindicator"
```

#### Authentication
```env
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"

# For JWT tokens
JWT_SECRET="your_jwt_secret_here"

# For data encryption (exactly 32 characters)
ENCRYPTION_KEY="your_32_character_encryption_key"
```

### Frontend (.env.local)

#### Core Configuration
```env
# Backend API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Authentication (same as backend)
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
```

## Optional API Keys (Enhanced Features)

### Financial Data APIs
```env
# Finnhub (https://finnhub.io/)
FINNHUB_API_KEY="your_finnhub_api_key_here"

# Financial Modeling Prep (https://financialmodelingprep.com/)
FMP_API_KEY="your_fmp_api_key_here"

# RapidAPI (https://rapidapi.com/)
RAPIDAPI_API_KEY="your_rapidapi_key_here"

# Census API (https://www.census.gov/data/developers/data-sets.html)
CENSUS_API_KEY="your_census_api_key_here"

# Twelve Data (https://twelvedata.com/)
TWELVEDATA_API_KEY="your_twelvedata_api_key_here"

# Polygon (https://polygon.io/)
POLYGON_API_KEY="your_polygon_api_key_here"
```

### OAuth Providers
```env
# Google OAuth (https://console.developers.google.com/)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### Payment Processing
```env
# Stripe (https://stripe.com/)
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
```

### Email Service
```env
# SMTP Configuration
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your_email@gmail.com"
EMAIL_SERVER_PASSWORD="your_app_password"
EMAIL_FROM="noreply@econindicatordaily.com"
```

### Analytics
```env
# Google Analytics
GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"

# Mixpanel
MIXPANEL_TOKEN="your_mixpanel_token"
NEXT_PUBLIC_MIXPANEL_TOKEN="your_mixpanel_token"
```

## Configuration Options

### Server Settings
```env
# Server port
PORT=3001

# Environment
NODE_ENV="development"  # development | production | test

# CORS
FRONTEND_URL="http://localhost:3000"

# Logging level
LOG_LEVEL="info"  # error | warn | info | debug
```

### Background Jobs
```env
# Enable automated data syncing
ENABLE_BACKGROUND_SYNC="true"

# Sync interval in hours
SYNC_INTERVAL_HOURS="24"
```

### Admin Configuration
```env
# Comma-separated list of admin email addresses
ADMIN_EMAILS="admin@econindicatordaily.com,dev@econindicatordaily.com"
NEXT_PUBLIC_ADMIN_EMAILS="admin@econindicatordaily.com,dev@econindicatordaily.com"
```

### Feature Flags
```env
# Frontend feature toggles
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
NEXT_PUBLIC_ENABLE_PRO_FEATURES="true"
NEXT_PUBLIC_ENABLE_ADMIN_PANEL="true"
```

## Environment Validation

The backend includes automatic environment validation that:

- ✅ Validates required variables are present
- ✅ Checks data types and formats
- ✅ Validates API key configurations
- ✅ Ensures security requirements (key lengths, etc.)
- ⚠️ Warns about missing optional features

### Validation Features

1. **Required Variables**: Core API keys and database URL must be present
2. **Conditional Validation**: OAuth requires both client ID and secret
3. **Format Validation**: URLs, email formats, and key lengths
4. **Feature Detection**: Automatically detects which features are enabled

## Development vs Production

### Development
- Uses `.env` files
- Allows missing optional variables
- Provides fallback configurations
- Detailed logging and validation warnings

### Production
- Environment variables set via deployment platform
- Strict validation (fails fast on missing required vars)
- No fallback values for security
- Minimal logging

## Security Best Practices

### 🔒 Security Guidelines

1. **Never commit .env files** - Already in .gitignore
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Rotate keys regularly** - Especially in production
4. **Separate dev/prod keys** - Never use production keys in development
5. **Limit admin access** - Only include necessary email addresses

### 🔑 API Key Security

- Store keys in environment variables only
- Use test keys for development
- Monitor API usage and quotas
- Rotate keys if compromised

## Getting API Keys

### Free APIs
1. **FRED** - Free, no rate limits: https://fred.stlouisfed.org/docs/api/api_key.html
2. **BLS** - Free, rate limited: https://www.bls.gov/developers/
3. **Census** - Free: https://www.census.gov/data/developers/
4. **Treasury** - No key required: https://fiscaldata.treasury.gov/

### Paid APIs
1. **Alpha Vantage** - Free tier available: https://www.alphavantage.co/
2. **Finnhub** - Free tier: https://finnhub.io/
3. **Financial Modeling Prep** - Free tier: https://financialmodelingprep.com/
4. **RapidAPI** - Various pricing: https://rapidapi.com/
5. **Polygon** - Free tier: https://polygon.io/

## Environment Files Structure

```
project/
├── .env.example              # Template for all environments
├── .env                      # Local development (gitignored)
├── .env.local               # Next.js local overrides (gitignored)
├── .env.development         # Development-specific (gitignored)
├── .env.production          # Production-specific (gitignored)
└── .env.test               # Test environment (gitignored)
```

## Troubleshooting

### Common Issues

1. **Environment validation errors**
   ```bash
   # Check your .env file format
   # Ensure no spaces around = signs
   # Use quotes for values with spaces
   ```

2. **API connection failures**
   ```bash
   # Verify API keys are correct
   # Check API rate limits
   # Confirm network connectivity
   ```

3. **Database connection issues**
   ```bash
   # Verify DATABASE_URL format
   # Check database server is running
   # Confirm user permissions
   ```

### Debug Commands

```bash
# Test environment loading
npm run dev

# Validate specific API keys
node -e "console.log(process.env.FRED_API_KEY)"

# Check database connection
npx prisma db push
```

## Deployment

### Vercel (Frontend)
1. Add environment variables in Vercel dashboard
2. Separate staging and production environments
3. Use Vercel's environment variable encryption

### Railway/Render (Backend)
1. Set environment variables in platform dashboard
2. Use platform's secret management
3. Enable auto-deployment on git push

### Environment Variable Priority
1. Platform environment variables (production)
2. .env.local (local development)
3. .env.development (development)
4. .env (fallback)

---

For questions or issues, check the troubleshooting section or contact the development team.