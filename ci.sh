#!/usr/bin/env bash
# CI release routine — runs all tests without watch mode
# Usage: ./ci.sh
# Exit code: 0 = all pass, non-zero = failure

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/web_crm" && pwd)"

echo "============================================"
echo "  Kezdes CI — $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# ── Backend ───────────────────────────────────────────────────────────────────
echo ""
echo "▶ Backend: Django system check"
cd "$BACKEND_DIR"
venv/bin/python manage.py check --fail-level WARNING

echo ""
echo "▶ Backend: pytest"
venv/bin/pytest --tb=short -q
BACKEND_EXIT=$?

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "▶ Frontend: TypeScript build check"
cd "$FRONTEND_DIR"
npx tsc --noEmit

echo ""
echo "▶ Frontend: vitest (single run, no watch)"
npm run test:run
FRONTEND_EXIT=$?

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
    echo "  ✅ ALL TESTS PASSED"
    exit 0
else
    echo "  ❌ FAILURES DETECTED"
    [ $BACKEND_EXIT -ne 0 ] && echo "     Backend exit: $BACKEND_EXIT"
    [ $FRONTEND_EXIT -ne 0 ] && echo "     Frontend exit: $FRONTEND_EXIT"
    exit 1
fi
