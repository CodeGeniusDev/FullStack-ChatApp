#!/bin/bash

# WhatsApp-like Chat App - Quick Setup Script
# This script will install all dependencies and help you get started

echo "🚀 Welcome to Chat App Setup!"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed!"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed!"
echo ""

# Check for .env file
cd ../backend
if [ ! -f .env ]; then
    echo "⚠️  No .env file found in backend/"
    echo "📝 Creating .env template..."
    cat > .env << EOF
MONGODB_URI=your_mongodb_connection_string_here
PORT=5002
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EOF
    echo "✅ .env template created!"
    echo "⚠️  Please edit backend/.env with your actual credentials"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "📋 Next Steps:"
echo "1. Edit backend/.env with your credentials:"
echo "   - MongoDB connection string"
echo "   - JWT secret key"
echo "   - Cloudinary credentials"
echo ""
echo "2. Start the backend:"
echo "   cd backend && npm start"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "📚 Documentation:"
echo "   - README.md           - Full documentation"
echo "   - SETUP_GUIDE.md      - Testing guide"
echo "   - WHATSAPP_FEATURES.md - Feature list"
echo "   - COMPARISON.md       - Before/After comparison"
echo ""
echo "Happy chatting! 💬✨"
