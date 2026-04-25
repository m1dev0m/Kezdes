#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
MOBILE_DIR="$ROOT_DIR/mobile-rn"

NGROK_PID_FILE="/tmp/kezdes_mobile_backend_ngrok.pid"
NGROK_LOG_FILE="/tmp/kezdes_mobile_backend_ngrok.log"

get_lan_ip() {
  hostname -I 2>/dev/null | awk '{print $1}'
}

backend_running() {
  python3 - <<'PY'
import socket, sys
sock = socket.socket()
sock.settimeout(0.5)
try:
    sock.connect(("127.0.0.1", 8000))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

ensure_backend() {
  if backend_running; then
    return
  fi

  (
    cd "$BACKEND_DIR"
    exec ./venv/bin/python manage.py runserver 0.0.0.0:8000
  ) >/tmp/kezdes_mobile_backend.log 2>&1 &

  for _ in $(seq 1 20); do
    if backend_running; then
      return
    fi
    sleep 1
  done

  echo "Backend did not start on port 8000." >&2
  exit 1
}

start_backend_ngrok() {
  if [[ -f "$NGROK_PID_FILE" ]]; then
    local existing_pid
    existing_pid="$(cat "$NGROK_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      return
    fi
    rm -f "$NGROK_PID_FILE"
  fi

  ngrok http 8000 --log=stdout >"$NGROK_LOG_FILE" 2>&1 &
  echo $! >"$NGROK_PID_FILE"

  for _ in $(seq 1 20); do
    if curl -fsS http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  echo "Ngrok backend tunnel did not start." >&2
  exit 1
}

get_backend_ngrok_url() {
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

run_lan() {
  ensure_backend
  local lan_ip
  lan_ip="$(get_lan_ip)"
  if [[ -z "$lan_ip" ]]; then
    echo "Could not detect LAN IP." >&2
    exit 1
  fi

  echo "Using LAN API: http://$lan_ip:8000/api/v1"
  cd "$MOBILE_DIR"
  EXPO_PUBLIC_API_URL="http://$lan_ip:8000/api/v1" npm run start:lan
}

run_tunnel() {
  ensure_backend
  start_backend_ngrok
  local backend_public_url
  backend_public_url="$(get_backend_ngrok_url)"
  if [[ -z "$backend_public_url" ]]; then
    echo "Could not read ngrok backend URL." >&2
    exit 1
  fi

  echo "Using tunneled API: $backend_public_url/api/v1"
  cd "$MOBILE_DIR"
  EXPO_PUBLIC_API_URL="$backend_public_url/api/v1" npm run start:tunnel
}

stop_tunnel() {
  if [[ -f "$NGROK_PID_FILE" ]]; then
    local pid
    pid="$(cat "$NGROK_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$NGROK_PID_FILE"
  fi
}

case "${1:-lan}" in
  lan)
    run_lan
    ;;
  tunnel)
    run_tunnel
    ;;
  stop-tunnel)
    stop_tunnel
    ;;
  *)
    echo "Usage: $0 {lan|tunnel|stop-tunnel}" >&2
    exit 1
    ;;
esac
