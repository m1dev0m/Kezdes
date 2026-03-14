#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-kezdes_db}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/kezdes_${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "PGPASSWORD is required for backup"
  exit 1
fi

pg_dump \
  --format=custom \
  --no-owner \
  --host "${DB_HOST}" \
  --port "${DB_PORT}" \
  --username "${DB_USER}" \
  --dbname "${DB_NAME}" \
  --file "${OUT_FILE}"

echo "Backup created: ${OUT_FILE}"
