#!/bin/bash

echo "🧪 Testing EconIndicatorDaily Setup"
echo "=================================="

# Test backend
echo "🔧 Testing Backend (http://localhost:3001)..."
BACKEND_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/health)
if [[ $BACKEND_RESPONSE == *"200" ]]; then
    echo "✅ Backend is responding correctly"
else
    echo "❌ Backend not responding. Response: $BACKEND_RESPONSE"
fi

# Test frontend
echo "🌐 Testing Frontend (http://localhost:3002)..."
FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3002)
if [[ $FRONTEND_RESPONSE == "200" ]]; then
    echo "✅ Frontend is responding correctly"
else
    echo "❌ Frontend not responding. HTTP Code: $FRONTEND_RESPONSE"
fi

# Test API endpoints
echo "📊 Testing API Endpoints..."
INDICATORS_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/indicators)
if [[ $INDICATORS_RESPONSE == *"200" ]]; then
    echo "✅ Indicators API is working"
else
    echo "❌ Indicators API failed. Response: $INDICATORS_RESPONSE"
fi

echo ""
echo "🚀 Access URLs:"
echo "   Frontend: http://localhost:3002"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/health"
echo ""
echo "🔒 To test auth: Go to frontend URL and click 'Sign in'"