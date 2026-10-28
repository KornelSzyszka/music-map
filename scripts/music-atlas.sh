#!/usr/bin/env bash
# Start, build data for, check or containerise the Music Atlas project (Linux/macOS).
# Counterpart of music-atlas.ps1. Run from anywhere; paths are resolved from this script.
#
# Usage: music-atlas.sh [--fetch] [--data] [--check] [--docker] [--no-open] [--port N]
#   (default)  serve the frontend with the Vite dev server and open it in the browser
#   --fetch    download the MTG-Jamendo source data into MUSIC_MAP_DATA_DIR (~1.4 GB), then exit
#   --data     rebuild features.json.gz from the Jamendo files, then start the dev server
#   --check    run the full definition-of-done checks (pipeline and frontend) and exit
#   --docker   run the frontend with Docker Compose on http://localhost:8080 instead of Vite
#   --no-open  do not open the browser
#   --port N   dev server port (default 5173)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pipeline="$root/pipeline"
frontend="$root/frontend"
derived="$root/data/derived"

fetch=0 data=0 check=0 docker=0 open=1 port=5173
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fetch) fetch=1 ;;
    --data) data=1 ;;
    --check) check=1 ;;
    --docker) docker=1 ;;
    --no-open) open=0 ;;
    --port) port="${2:?--port needs a value}"; shift ;;
    -h|--help) sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\033[36m==> %s\033[0m\n' "$1"; }

import_data_directory() {
  [[ -n "${MUSIC_MAP_DATA_DIR:-}" ]] && return
  local line
  line="$(grep -E '^\s*MUSIC_MAP_DATA_DIR\s*=' "$root/.env" 2>/dev/null | head -n1 || true)"
  if [[ -n "$line" ]]; then
    line="${line#*=}"
    line="$(printf '%s' "$line" | sed -E "s/^\s+|\s+$//g; s/^[\"']|[\"']$//g")"
    export MUSIC_MAP_DATA_DIR="$line"
    return
  fi
  echo 'MUSIC_MAP_DATA_DIR is not set. Put it in .env (see .env.example) or export it.' >&2
  exit 1
}

sync_frontend_data() {
  local target="$frontend/public/atlas" file missing=()
  mkdir -p "$target"
  for file in features.json.gz feature_sample.json.gz; do
    if [[ -f "$derived/$file" ]]; then cp -f "$derived/$file" "$target/"; else missing+=("$file"); fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Warning: missing in data/derived: ${missing[*]}. The Features tab will be incomplete. Run: music-atlas --data" >&2
  fi
}

cd "$root"

if (( check )); then
  cd "$pipeline"
  step 'pipeline: pytest'; uv run pytest -q -p no:cacheprovider
  step 'pipeline: ruff check'; uv run ruff check .
  step 'pipeline: ruff format --check'; uv run ruff format --check .
  cd "$frontend"
  step 'frontend: npm install'; npm install --no-audit --no-fund
  step 'frontend: typecheck'; npm run typecheck
  step 'frontend: lint'; npm run lint
  step 'frontend: test'; npm run test
  step 'frontend: build'; npm run build
  printf '\033[32mAll checks passed.\033[0m\n'
  exit 0
fi

if (( fetch )); then
  cd "$pipeline"
  step 'pipeline: fetch source data'
  PYTHONIOENCODING=utf-8 uv run python scripts/fetch_data.py
  exit 0
fi

if (( data )); then
  import_data_directory
  cd "$pipeline"
  step 'pipeline: build feature graph'
  PYTHONPATH=src PYTHONIOENCODING=utf-8 uv run python scripts/build_feature_graph.py "$derived"
fi

if (( docker )); then
  [[ -f "$root/.env" ]] || { echo 'Docker needs .env with MUSIC_MAP_DATA_DIR (copy .env.example).' >&2; exit 1; }
  printf '\033[32mServing on http://localhost:8080 (Ctrl+C to stop)\033[0m\n'
  (( open )) && command -v xdg-open >/dev/null && (xdg-open http://localhost:8080 >/dev/null 2>&1 &)
  exec docker compose up --build frontend
fi

sync_frontend_data
cd "$frontend"
if [[ ! -d node_modules ]]; then step 'frontend: npm install'; npm install --no-audit --no-fund; fi
open_flag=(); (( open )) && open_flag=(--open)
printf '\033[32mDev server on http://localhost:%s (Ctrl+C to stop)\033[0m\n' "$port"
exec npm run dev -- --port "$port" --strictPort "${open_flag[@]}"
