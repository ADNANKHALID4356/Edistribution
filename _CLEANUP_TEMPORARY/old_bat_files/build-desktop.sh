#!/bin/bash

# ========================================
# Desktop App - Production Build Script
# ========================================

echo "========================================="
echo "Building Desktop App for Distribution"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18.x or newer"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"
echo ""

# Navigate to desktop directory
cd desktop || exit

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build React application
echo "🔨 Building React application..."
npm run build

# Check if build succeeded
if [ ! -d "build" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ React build completed!"
echo ""

# Package desktop app
echo "📦 Packaging desktop application..."
npm run electron-build

# Check if packaging succeeded
if [ -d "dist" ]; then
    echo ""
    echo "========================================="
    echo "✅ Build Completed Successfully!"
    echo "========================================="
    echo ""
    echo "📦 Built files are in: desktop/dist/"
    echo ""
    echo "Distribution files:"
    echo "  - Windows Installer: dist/*.exe"
    echo "  - Portable Version: dist/win-unpacked/"
    echo ""
    echo "Next steps:"
    echo "1. Test the installer before distribution"
    echo "2. Distribute to clients via:"
    echo "   - Direct download"
    echo "   - Email"
    echo "   - Cloud storage"
    echo "   - USB drives"
    echo ""
else
    echo "❌ Packaging failed!"
    exit 1
fi
