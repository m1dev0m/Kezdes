#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/web_crm"

BACKEND_PID_FILE="/tmp/kezdes_backend.pid"
FRONTEND_PID_FILE="/tmp/kezdes_frontend.pid"
NGROK_PID_FILE="/tmp/kezdes_ngrok.pid"

BACKEND_LOG="/tmp/kezdes_backend.log"
FRONTEND_LOG="/tmp/kezdes_frontend.log"
NGROK_LOG="/tmp/kezdes_ngrok.log"

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

wait_for_http() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "$url"; then
      return 0
    fi
    sleep 1
  done

  echo "$label did not start in time." >&2
  return 1
}

get_ngrok_url() {
  python3 - <<'PY'
import json
import urllib.request

with urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=5) as response:
    payload = json.load(response)

for tunnel in payload.get("tunnels", []):
    public_url = tunnel.get("public_url", "")
    if public_url.startswith("https://"):
        print(public_url)
        break
PY
}

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "Backend already running."
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

  (
    cd "$FRONTEND_DIR"
    exec npm run dev -- --host 0.0.0.0
  ) >"$FRONTEND_LOG" 2>&1 &
  echo $! >"$FRONTEND_PID_FILE"
  wait_for_http "http://127.0.0.1:5173" "Frontend"
}

start_ngrok() {
  if is_running "$NGROK_PID_FILE"; then
    echo "Ngrok already running."
    return
  fi

  ngrok http 5173 --log=stdout >"$NGROK_LOG" 2>&1 &
  echo $! >"$NGROK_PID_FILE"
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
  start_ngrok
  sleep 2

  local public_url
  public_url="$(get_ngrok_url || true)"

  echo
  echo "Backend:  http://127.0.0.1:8000"
  echo "Frontend: http://127.0.0.1:5173"
  if [[ -n "$public_url" ]]; then
    echo "Ngrok:    $public_url"
  else
    echo "Ngrok:    could not read public URL yet"
  fi
  echo
  echo "Logs:"
  echo "  backend  -> $BACKEND_LOG"
  echo "  frontend -> $FRONTEND_LOG"
  echo "  ngrok    -> $NGROK_LOG"
}

stop_all() {
  stop_pid "$NGROK_PID_FILE" "Ngrok"
  stop_pid "$FRONTEND_PID_FILE" "Frontend"
  stop_pid "$BACKEND_PID_FILE" "Backend"
}

status_all() {
  status_pid "$BACKEND_PID_FILE" "Backend"
  status_pid "$FRONTEND_PID_FILE" "Frontend"
  status_pid "$NGROK_PID_FILE" "Ngrok"

  if is_running "$NGROK_PID_FILE"; then
    local public_url
    public_url="$(get_ngrok_url || true)"
    if [[ -n "$public_url" ]]; then
      echo "Public URL: $public_url"
    fi
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
