#!/usr/bin/env bash
# Prepare the Music Atlas development environment from a fresh checkout (Linux/macOS).
# Counterpart of build-atlas.ps1. Safe to re-run; paths are resolved from this script.
#
# Usage: build-atlas.sh [--data] [--check]
#   --data   also download the MTG-Jamendo source data (~1.4 GB) and build data/derived
#   --check  run the full definition-of-done checks after installing
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_script="$root/scripts/music-atlas.sh"

data=0 check=0
for arg in "$@"; do
  case "$arg" in
    --data) data=1 ;;
    --check) check=1 ;;
    -h|--help) sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\033[36m==> %s\033[0m\n' "$1"; }
need() { command -v "$1" >/dev/null || { echo "'$1' not found. $2" >&2; exit 1; }; }

need uv 'Install it from https://docs.astral.sh/uv/ (it also provides Python 3.12).'
need node 'Install Node 24 from https://nodejs.org/.'
need npm 'It ships with Node.'
node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
(( node_major >= 24 )) || echo "Warning: Node 24 is expected, found $(node --version)." >&2

if [[ ! -f "$root/.env" ]]; then
  cp "$root/.env.example" "$root/.env"
  echo "Warning: created .env from .env.example. Set MUSIC_MAP_DATA_DIR in $root/.env before using --data." >&2
fi

step 'pipeline: uv sync'; (cd "$root/pipeline" && uv sync)
step 'frontend: npm install'; (cd "$root/frontend" && npm install --no-audit --no-fund)

if (( data )); then
  "$run_script" --fetch
  step 'pipeline: build feature graph'
  (cd "$root/pipeline" && PYTHONPATH=src PYTHONIOENCODING=utf-8 uv run python scripts/build_feature_graph.py ../data/derived)
fi

if (( check )); then "$run_script" --check; fi

printf '\033[32mEnvironment ready. Start the app with: music-atlas\033[0m\n'
