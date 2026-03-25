#!/bin/bash
# Скрипт для запуска проекта (Django Backend + Web CRM + React Native)

set -euo pipefail

cd "$(dirname "$0")"

BACKEND_PID=""
WEB_PID=""

cleanup() {
    echo ""
    echo "Остановка серверов..."
    if [ -n "${BACKEND_PID}" ]; then
        kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${WEB_PID}" ]; then
        kill "${WEB_PID}" 2>/dev/null || true
    fi
}

trap cleanup INT TERM EXIT

echo "====================================="
echo " Запуск Django Backend..."
echo "====================================="
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    PYTHON_BIN="venv/bin/python"
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    PYTHON_BIN=".venv/bin/python"
else
    PYTHON_BIN="python3"
fi
"$PYTHON_BIN" manage.py migrate --noinput
# ASGI server (WS enabled). For plain HTTP-only dev you can still use runserver manually.
"$PYTHON_BIN" -m daphne -b 0.0.0.0 -p 8000 -v 2 config.asgi:application &
BACKEND_PID=$!
cd ..


echo " Запуск Web CRM (Admin Panel)..."

cd web_crm
npm run dev &
WEB_PID=$!
cd ..

echo " Запуск React Native (Expo) Frontend..."
cd mobile-rn
npx expo start --clear


echo "Запуск телеграм бота"
cd telegram_bot
source venv/bin/activate
python3 main.py 