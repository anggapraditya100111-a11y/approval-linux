#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
docker compose exec -T ainet-approval node scripts/backup.mjs
