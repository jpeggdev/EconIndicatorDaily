#!/bin/bash

echo "🚀 Starting EconIndicatorDaily Development Servers"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    pkill -P $$
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo "📊 Starting backend server on port 3001..."
cd "$PROJECT_ROOT/backend" && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server  
echo "🌐 Starting frontend server on port 3000..."
cd "$PROJECT_ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers started successfully!"
echo "🔗 Frontend: http://localhost:3000 (or next available port)"
echo "🔗 Backend: http://localhost:3001"
echo "📋 API Health: http://localhost:3001/health"
echo ""
echo "✨ Enhanced features available:"
echo "├─ 🎯 Click any card for detailed information"
echo "├─ 🚀 Hover effects for floating cards"
echo "├─ 📊 Enhanced number formatting (T, B, M, K)"
echo "└─ 🌍 World Bank indicators integrated"
echo ""
echo "🔒 Demo Auth: Use any email to sign in"
echo "📝 Press Ctrl+C to stop both servers"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID