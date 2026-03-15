#!/bin/bash
# Development ASGI server with guaranteed WS support

set -e

echo "🚀 Starting Kezdes Backend (ASGI mode - WS enabled)"
echo "   HTTP/WS: http://localhost:8000"
echo "   API docs: http://localhost:8000/api/docs/"
echo ""
echo "Ctrl+C to stop"
echo ""

# Ensure database is migrated
python manage.py migrate --noinput

# Run daphne with access logs
daphne -b 0.0.0.0 -p 8000 -v 2 config.asgi:application
