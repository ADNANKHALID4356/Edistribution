#!/bin/bash
# Pull latest backend code from GitHub and restart PM2 on VPS.
# Run from repo root: bash backend/deploy-vps-update.sh

set -e

REPO_DIR="${REPO_DIR:-/var/www/distribution-system}"
PM2_NAME="${PM2_NAME:-distribution-api}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_REF="${GIT_REF:-main}"

echo "Deploying backend from ${GIT_REMOTE}/${GIT_REF} in ${REPO_DIR}"

cd "$REPO_DIR"
git fetch "$GIT_REMOTE" "$GIT_REF"
git reset --hard "${GIT_REMOTE}/${GIT_REF}"

cd backend
npm ci --omit=dev
mkdir -p logs

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME"
else
  pm2 start ecosystem.config.js
fi

pm2 save
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-5000}/api/health" && echo ""
echo "Backend deploy complete."
