#!/usr/bin/env bash
set -euo pipefail

# Configuration must be in deployment/deploy.env (git-ignored for security)
if [[ ! -f "deployment/deploy.env" ]]; then
  echo "❌ ERROR: deployment/deploy.env not found!"
  echo ""
  echo "Create it from the example:"
  echo "  cp deployment/deploy.env.example deployment/deploy.env"
  echo ""
  echo "Then edit deployment/deploy.env with your server credentials."
  exit 1
fi

# Load configuration
# shellcheck disable=SC1091
source "deployment/deploy.env"

# Validate required variables
if [[ -z "${HOST:-}" ]] || [[ -z "${USER:-}" ]] || [[ -z "${REMOTE_PATH:-}" ]]; then
  echo "❌ ERROR: HOST, USER, and REMOTE_PATH must be set in deployment/deploy.env"
  exit 1
fi

SSH_KEY_PATH="${SSH_KEY_PATH:-}"

SSH_OPTS=(-o StrictHostKeyChecking=no)
if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH" -o IdentitiesOnly=yes)
fi

SSH_CMD=(ssh "${SSH_OPTS[@]}")
SCP_CMD=(scp "${SSH_OPTS[@]}")
RSYNC_RSH=(ssh "${SSH_OPTS[@]}")
RSYNC_CMD=(rsync -e "$(printf '%q ' "${RSYNC_RSH[@]}")")

# Set DEPLOY_PASS to empty if not set
DEPLOY_PASS="${DEPLOY_PASS:-}"

if [[ -n "$DEPLOY_PASS" ]]; then
  if ! command -v sshpass &> /dev/null; then
    echo "sshpass is required for DEPLOY_PASS auth. Install: brew install sshpass / sudo apt install sshpass"
    exit 1
  fi
  export SSHPASS="$DEPLOY_PASS"
  SSH_CMD=(sshpass -e ssh "${SSH_OPTS[@]}")
  SCP_CMD=(sshpass -e scp "${SSH_OPTS[@]}")
  RSYNC_CMD=(sshpass -e rsync -e "$(printf '%q ' "${RSYNC_RSH[@]}")")
fi

echo "🚀 Starting Deployment to $HOST..."

# 1. Build Frontend
echo "📦 Building Frontend..."
npm run build || { echo "Build failed"; exit 1; }

# 2. Prepare Remote Directory
echo "📂 Preparing Remote Directories..."
"${SSH_CMD[@]}" $USER@$HOST "mkdir -p $REMOTE_PATH/server $REMOTE_PATH/dist"

# 3. Deploy Frontend
echo "📤 Uploading Frontend..."
"${RSYNC_CMD[@]}" -rlz --no-perms --no-times --omit-dir-times --no-owner --no-group --delete dist/ $USER@$HOST:$REMOTE_PATH/dist/

# 4. Deploy Backend
echo "📤 Uploading Backend..."
# Exclude node_modules, .env (should be set manually on server)
"${RSYNC_CMD[@]}" -rlz --no-perms --no-times --omit-dir-times --no-owner --no-group --exclude 'node_modules' --exclude '.env' server/ $USER@$HOST:$REMOTE_PATH/server/

# 5. Install Dependencies on Server
echo "🔧 Installing Server Dependencies..."
"${SSH_CMD[@]}" $USER@$HOST "cd $REMOTE_PATH/server && npm install --production"

# 6. Restart Service
echo "🔄 Restarting Service..."
"${SSH_CMD[@]}" $USER@$HOST "sudo systemctl restart quoteflow"

echo "✅ Deployment Complete! Visit http://$HOST"
