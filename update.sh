#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if docker compose ps --status running --services | grep -qx ainet-approval; then ./backup.sh; fi
git fetch origin main
git pull --ff-only origin main
if [ ! -f .env ]; then cp .env.example .env; fi
if ! grep -q '^APP_ACCESS_PASSWORD=.' .env || grep -q '^APP_ACCESS_PASSWORD=GantiPasswordAkses!$' .env; then
  ACCESS_PASSWORD_VALUE="$(openssl rand -hex 8)"
  if grep -q '^APP_ACCESS_PASSWORD=' .env; then
    sed -i "s|^APP_ACCESS_PASSWORD=.*|APP_ACCESS_PASSWORD=$ACCESS_PASSWORD_VALUE|" .env
  else
    printf '\nAPP_ACCESS_PASSWORD=%s\n' "$ACCESS_PASSWORD_VALUE" >> .env
  fi
  echo "Password akses aplikasi baru: $ACCESS_PASSWORD_VALUE"
fi
docker compose build --pull
docker compose up -d
docker compose ps
