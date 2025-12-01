#!/bin/bash

set -e

echo "===== QQuiz Local Deployment Script ====="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $PYTHON_VERSION"

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "Warning: PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL or use Docker: docker-compose up -d postgres"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
alembic upgrade head || echo "Warning: Alembic migration failed. Database might not be initialized."

# Create uploads directory
mkdir -p uploads

# Start backend
echo "Starting backend on http://localhost:8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd ../frontend

# Install frontend dependencies
echo "Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start frontend
echo "Starting frontend on http://localhost:3000..."
npm start &
FRONTEND_PID=$!

echo ""
echo "===== QQuiz is running! ====="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
