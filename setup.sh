#!/bin/bash

# Chat App - Quick Setup Script
# This script installs all dependencies and prepares the app for running

echo "🚀 Chat App - Quick Setup"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"
echo ""

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found in backend directory${NC}"
    echo "Please create a .env file with required environment variables"
    echo "See OPTIMIZATION_GUIDE.md for details"
fi

npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend installation failed${NC}"
    exit 1
fi

cd ..
echo ""

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend

if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found in frontend directory${NC}"
    echo "Please create a .env file with required environment variables"
    echo "See OPTIMIZATION_GUIDE.md for details"
fi

npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Frontend installation failed${NC}"
    exit 1
fi

cd ..
echo ""

# Setup complete
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Configure .env files in both backend and frontend directories"
echo "2. Start the backend: cd backend && npm run dev"
echo "3. Start the frontend: cd frontend && npm run dev"
echo ""
echo "📖 For detailed instructions, see OPTIMIZATION_GUIDE.md"
echo ""
echo -e "${BLUE}🎉 Happy coding!${NC}"
