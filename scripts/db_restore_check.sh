#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
SOURCE_DUMP="${1:-}"
RESTORE_DB="${RESTORE_DB:-kezdes_restore_check}"

if [[ -z "${SOURCE_DUMP}" ]]; then
  echo "Usage: $0 <path-to-dump-file>"
  exit 1
fi

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "PGPASSWORD is required for restore check"
  exit 1
fi

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${RESTORE_DB};"

pg_restore \
  --no-owner \
  --host "${DB_HOST}" \
  --port "${DB_PORT}" \
  --username "${DB_USER}" \
  --dbname "${RESTORE_DB}" \
  "${SOURCE_DUMP}"

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${RESTORE_DB}" -c "SELECT COUNT(*) AS users_count FROM auth_user;"

echo "Restore check completed successfully on database: ${RESTORE_DB}"
