#!/bin/bash

echo "🚀 MyBudget Backend Quick Start"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cp env.example .env.local
    echo "⚠️  Please edit .env.local with your database credentials"
    echo "   - Set DB_PASSWORD to your actual PostgreSQL password"
    echo "   - Change JWT_SECRET to a secure random string"
else
    echo "✅ .env.local already exists"
fi

# Check if database exists
echo "🗄️  Checking database..."
if psql -lqt | cut -d \| -f 1 | grep -qw mybudget; then
    echo "✅ Database 'mybudget' already exists"
else
    echo "📊 Creating database 'mybudget'..."
    createdb mybudget
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database. Please check your PostgreSQL permissions."
        exit 1
    fi
fi

# Run database setup
echo "🔧 Setting up database schema..."
npm run db:setup

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully"
else
    echo "❌ Database setup failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your database credentials"
echo "2. Start the development server: npm run dev"
echo "3. Test the API endpoints"
echo ""
echo "📚 For more information, see BACKEND_README.md"
echo ""
echo "Happy coding! 🚀"
