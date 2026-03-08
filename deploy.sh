#!/bin/bash

# Deploy Script for CotaFácil Automação
# Usage: ./deploy.sh
# 
# This script should be executed on the VPS after cloning the repository
# Make sure the .env file already exists before executing

set -e  # Stop on error

echo "🚀 Starting CotaFácil Automação deploy..."
echo ""

# Go to application directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Create the .env file with the necessary environment variables."
    echo "   See the DEPLOYMENT_GUIDE.md guide for more information."
    exit 1
fi

# Backup .env
echo "💾 Creating .env backup..."
cp .env .env.backup
echo "✅ .env backup created"
echo ""

# Update code from GitHub
echo "📥 Updating code from GitHub..."
git fetch origin

# Check if there are changes
if [ -z "$(git status -uno | grep 'Your branch is behind')" ] && [ -z "$(git status -uno | grep 'Changes not staged')" ]; then
    echo "ℹ️  No updates available"
else
    echo "📦 Applying updates..."
    git reset --hard origin/main
    echo "✅ Code updated"
fi
echo ""

# Restore .env (in case it was overwritten)
if [ -f .env.backup ]; then
    mv .env.backup .env
    echo "✅ .env restored"
    echo ""
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install --production
echo "✅ Dependencies installed"
echo ""

# Check/install Playwright browsers
echo "🌐 Checking Playwright browsers..."
if ! npx playwright install chromium --dry-run 2>/dev/null; then
    echo "📥 Installing Chromium..."
    npx playwright install chromium || echo "⚠️  Warning: Failed to install Chromium, continuing..."
    npx playwright install-deps chromium || echo "⚠️  Warning: Failed to install Chromium dependencies, continuing..."
else
    echo "✅ Chromium already installed"
fi
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found. Installing..."
    npm install -g pm2
fi

# Restart application with PM2
echo "🔄 Restarting application with PM2..."

# Check if application is already running
if pm2 list | grep -q "cotafacil-automacao"; then
    echo "🔄 Application found, restarting..."
    pm2 restart cotafacil-automacao
else
    echo "🚀 Starting application for the first time..."
    pm2 start src/index.js --name cotafacil-automacao
    pm2 save
    echo "💡 Tip: Run 'pm2 startup' to start automatically on boot"
fi

echo ""
echo "✅ Deploy completed!"
echo ""
echo "📊 Application status:"
pm2 status cotafacil-automacao
echo ""
echo "📋 Last 20 lines of logs:"
pm2 logs cotafacil-automacao --lines 20 --nostream
echo ""
echo "💡 Useful commands:"
echo "   - View logs in real-time: pm2 logs cotafacil-automacao"
echo "   - View status: pm2 status"
echo "   - Monitor resources: pm2 monit"
echo "   - Restart: pm2 restart cotafacil-automacao"
echo ""
