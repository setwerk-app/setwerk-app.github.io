#!/bin/bash
# Startet Setwerk lokal und öffnet es im Browser.
# Einmal in Chrome/Edge über "App installieren" installieren – danach läuft Setwerk auch ohne dieses Skript (offline).
cd "$(dirname "$0")"
PORT=8765
if ! lsof -i :$PORT >/dev/null 2>&1; then
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "http://localhost:$PORT"
else
  open "http://localhost:$PORT"
fi
