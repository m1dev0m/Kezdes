#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/web_crm"

BACKEND_PID_FILE="/tmp/kezdes_lan_backend.pid"
FRONTEND_PID_FILE="/tmp/kezdes_lan_frontend.pid"

BACKEND_LOG="/tmp/kezdes_lan_backend.log"
FRONTEND_LOG="/tmp/kezdes_lan_frontend.log"

is_running() {
  local pid_file="$1"
  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    return 1
  fi

  kill -0 "$pid" 2>/dev/null
}

port_is_open() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket()
sock.settimeout(0.5)
try:
    sock.connect(("127.0.0.1", port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

wait_for_http() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 30); do
    local status_code
    status_code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$status_code" =~ ^[1-5][0-9][0-9]$ ]]; then
      return 0
    fi
    sleep 1
  done

  echo "$label did not start in time." >&2
  return 1
}

get_lan_ip() {
  hostname -I 2>/dev/null | awk '{print $1}'
}

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "Backend already running."
    return
  fi

  if port_is_open 8000; then
    echo "Backend port 8000 is already in use."
    return
  fi

  (
    cd "$BACKEND_DIR"
    exec ./venv/bin/python manage.py runserver 0.0.0.0:8000
  ) >"$BACKEND_LOG" 2>&1 &
  echo $! >"$BACKEND_PID_FILE"
  wait_for_http "http://127.0.0.1:8000/api/v1/" "Backend"
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    echo "Frontend already running."
    return
  fi

  if port_is_open 5173; then
    echo "Frontend port 5173 is already in use."
    return
  fi

  (
    cd "$FRONTEND_DIR"
    exec npm run dev -- --host 0.0.0.0
  ) >"$FRONTEND_LOG" 2>&1 &
  echo $! >"$FRONTEND_PID_FILE"
  wait_for_http "http://127.0.0.1:5173" "Frontend"
}

stop_pid() {
  local pid_file="$1"
  local label="$2"

  if ! is_running "$pid_file"; then
    rm -f "$pid_file"
    echo "$label is not running."
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  kill "$pid" 2>/dev/null || true
  rm -f "$pid_file"
  echo "$label stopped."
}

status_pid() {
  local pid_file="$1"
  local label="$2"

  if is_running "$pid_file"; then
    echo "$label: running (PID $(cat "$pid_file"))"
  else
    echo "$label: stopped"
  fi
}

start_all() {
  start_backend
  start_frontend

  local lan_ip
  lan_ip="$(get_lan_ip)"

  echo
  echo "Backend:  http://127.0.0.1:8000"
  echo "Frontend: http://127.0.0.1:5173"
  if [[ -n "$lan_ip" ]]; then
    echo "LAN URL:  http://$lan_ip:5173"
    echo "API URL:  http://$lan_ip:8000/api/v1"
  else
    echo "LAN URL:  could not determine local IP"
  fi
  echo
  echo "Logs:"
  echo "  backend  -> $BACKEND_LOG"
  echo "  frontend -> $FRONTEND_LOG"
}

stop_all() {
  stop_pid "$FRONTEND_PID_FILE" "Frontend"
  stop_pid "$BACKEND_PID_FILE" "Backend"
}

status_all() {
  status_pid "$BACKEND_PID_FILE" "Backend"
  status_pid "$FRONTEND_PID_FILE" "Frontend"

  local lan_ip
  lan_ip="$(get_lan_ip)"
  if [[ -n "$lan_ip" ]]; then
    echo "LAN URL: http://$lan_ip:5173"
  fi
}

case "${1:-start}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    start_all
    ;;
  status)
    status_all
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
