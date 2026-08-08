#!/usr/bin/env bash
set -euo pipefail

echo "[start.sh] Installing root dependencies"
npm install --no-audit --no-fund

echo "[start.sh] Building frontend"
npm run build --prefix frontend

echo "[start.sh] Installing backend production dependencies"
npm install --no-audit --no-fund --prefix backend

echo "[start.sh] Starting backend"
export PORT=${PORT:-5000}
node backend/src/server.js
