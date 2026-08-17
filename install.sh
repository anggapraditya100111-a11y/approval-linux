#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/DATA/AppData/ainet-approval/app}"
REPO_URL="${REPO_URL:-https://github.com/anggapraditya100111-a11y/approval-linux.git}"
mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then git clone "$REPO_URL" "$APP_DIR"; fi
cd "$APP_DIR"
if [ ! -f .env ]; then
  ADMIN_PASSWORD_VALUE="$(openssl rand -hex 8)"
  ACCESS_PASSWORD_VALUE="$(openssl rand -hex 8)"
  cp .env.example .env
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASSWORD_VALUE|" .env
  sed -i "s|^APP_ACCESS_PASSWORD=.*|APP_ACCESS_PASSWORD=$ACCESS_PASSWORD_VALUE|" .env
elif ! grep -q '^APP_ACCESS_PASSWORD=.' .env; then
  ACCESS_PASSWORD_VALUE="$(openssl rand -hex 8)"
  if grep -q '^APP_ACCESS_PASSWORD=' .env; then
    sed -i "s|^APP_ACCESS_PASSWORD=.*|APP_ACCESS_PASSWORD=$ACCESS_PASSWORD_VALUE|" .env
  else
    printf '\nAPP_ACCESS_PASSWORD=%s\n' "$ACCESS_PASSWORD_VALUE" >> .env
  fi
fi
mkdir -p data backups
chown -R 1001:1001 data
docker compose up -d --build
echo "AINET Approval aktif di port $(sed -n 's/^APP_PORT=//p' .env)"
echo "Username awal: $(sed -n 's/^ADMIN_USERNAME=//p' .env)"
echo "Password Super Admin: $(sed -n 's/^ADMIN_PASSWORD=//p' .env)"
echo "Password akses aplikasi: $(sed -n 's/^APP_ACCESS_PASSWORD=//p' .env | tail -n 1)"
