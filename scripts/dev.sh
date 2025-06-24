#!/bin/bash

echo "🚀 Starting EconIndicatorDaily Development Servers"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    pkill -P $$
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo "📊 Starting backend server on port 3001..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server  
echo "🌐 Starting frontend server on port 3000..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ Servers started!"
echo "🔗 Frontend: http://localhost:3002 (or next available port)"
echo "🔗 Backend: http://localhost:3001"
echo "📋 API Health: http://localhost:3001/health"
echo "🔒 Demo Auth: Use any email to sign in"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID