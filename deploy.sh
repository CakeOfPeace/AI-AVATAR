#!/bin/bash

echo "=========================================="
echo "Avatar Dashboard Deployment"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "1. Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "2. Stopping existing PM2 process..."
pm2 stop avatar-dashboard 2>/dev/null || true
pm2 delete avatar-dashboard 2>/dev/null || true

echo ""
echo "3. Starting new PM2 process..."
pm2 start ecosystem.config.cjs

echo ""
echo "4. Saving PM2 process list..."
pm2 save

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
pm2 status
