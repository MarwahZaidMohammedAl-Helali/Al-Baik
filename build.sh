#!/bin/bash

echo "🔨 Building Wholesale E-Commerce Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build TypeScript
echo "🏗️ Building TypeScript..."
npm run build

# Create public directory if it doesn't exist
mkdir -p public

echo "✅ Build completed successfully!"
echo "🚀 Ready for deployment!"