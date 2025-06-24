# Local Testing Guide

## 🚀 Quick Start

1. **Start both servers:**
   ```bash
   ./scripts/dev.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:3002 (or next available port)
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

## 🔒 Authentication Testing

**Demo Authentication (No Email Required):**
1. Go to the frontend URL
2. Click "Sign in" 
3. Enter any email address (e.g., `test@example.com`)
4. Click "Sign in with Email" 
5. You'll be automatically signed in and redirected to the dashboard

## 📊 Features to Test

### Dashboard
- ✅ View economic indicators cards
- ✅ See subscription status banner (shows "free plan")
- ✅ User authentication state in header

### API Endpoints
- `GET /health` - Server health check
- `GET /api/indicators` - List all indicators (will be empty initially)
- `POST /api/indicators/sync` - Sync data from FRED API
- `GET /api/users/profile/:id` - User profile
- `PATCH /api/users/subscription/:id` - Update subscription

### Data Sync
1. Click "Sync Data" button in dashboard
2. This will initialize 5 core economic indicators
3. **Note:** Requires valid FRED API key in backend/.env

## 🔧 Configuration

### Backend (.env)
```bash
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
FRED_API_KEY=your_actual_fred_api_key_here
NEXTAUTH_SECRET=local_development_secret_key_123
NEXTAUTH_URL=http://localhost:3000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=local_development_secret_key_123
NEXTAUTH_URL=http://localhost:3000
```

## 📝 Demo Limitations

- **Authentication:** Uses in-memory storage (data lost on restart)
- **Database:** SQLite for development
- **API:** Limited to demo FRED API calls without real key
- **Email:** No actual email sending (credentials-only auth)

## 🐛 Troubleshooting

**Port Issues:**
- Frontend will automatically use next available port (3002, 3003, etc.)
- Backend is fixed on 3001

**Database Issues:**
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

**Build Issues:**
```bash
# Backend
cd backend && npm run build

# Frontend  
cd frontend && npm run build
```

## 🔄 Reset Everything
```bash
# Kill all processes
pkill -f "npm run dev"

# Reset database
cd backend && npx prisma migrate reset

# Restart servers
./scripts/dev.sh
```