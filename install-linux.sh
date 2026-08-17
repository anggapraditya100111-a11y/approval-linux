#!/usr/bin/env bash
set -euo pipefail
export APP_DIR="${APP_DIR:-/opt/ainet-approval}"
export REPO_URL="${REPO_URL:-https://github.com/anggapraditya100111-a11y/approval-linux.git}"
export DATA_PATH="${DATA_PATH:-/var/lib/ainet-approval}"
mkdir -p "$DATA_PATH"
chown -R 1001:1001 "$DATA_PATH"
bash "$(dirname "$0")/install.sh"
sed -i "s|^DATA_PATH=.*|DATA_PATH=$DATA_PATH|" "$APP_DIR/.env"
cd "$APP_DIR" && docker compose up -d
