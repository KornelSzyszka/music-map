<#
.SYNOPSIS
  Start, build data for, check or containerise the Music Atlas project.

.DESCRIPTION
  Default: serve the frontend with the Vite dev server and open it in the browser.
  Run from anywhere; paths are resolved from this script's location.

.PARAMETER Fetch
  Download the MTG-Jamendo source data into MUSIC_MAP_DATA_DIR (about 1.4 GB, verified, resumable), then exit.
.PARAMETER Data
  Rebuild features.json.gz from the Jamendo files (needs MUSIC_MAP_DATA_DIR, from the
  environment or from .env), then start the dev server.
.PARAMETER Check
  Run the full definition-of-done checks (pipeline and frontend) and exit.
.PARAMETER Docker
  Run the frontend with Docker Compose on http://localhost:8080 instead of Vite.
.PARAMETER NoOpen
  Do not open the browser.
.PARAMETER Port
  Dev server port (default 5173).
#>
[CmdletBinding()]
param(
  [switch]$Fetch,
  [switch]$Data,
  [switch]$Check,
  [switch]$Docker,
  [switch]$NoOpen,
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pipeline = Join-Path $root 'pipeline'
$frontend = Join-Path $root 'frontend'
$derived = Join-Path $root 'data/derived'
$exportFile = 'features.json.gz'
$sampleFile = 'feature_sample.json.gz'

function Invoke-Step([string]$Title, [scriptblock]$Command) {
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Step failed (exit code $LASTEXITCODE): $Title" }
}

function Import-DataDirectory {
  if ($env:MUSIC_MAP_DATA_DIR) { return }
  $envFile = Join-Path $root '.env'
  if (Test-Path $envFile) {
    $line = Select-String -Path $envFile -Pattern '^\s*MUSIC_MAP_DATA_DIR\s*=\s*(.+?)\s*$' | Select-Object -First 1
    if ($line) { $env:MUSIC_MAP_DATA_DIR = $line.Matches[0].Groups[1].Value.Trim('"', "'"); return }
  }
  throw 'MUSIC_MAP_DATA_DIR is not set. Put it in .env (see .env.example) or export it.'
}

function Sync-FrontendData {
  $files = @($exportFile, $sampleFile)
  $missing = $files | Where-Object { -not (Test-Path (Join-Path $derived $_)) }
  if ($missing) {
    Write-Warning "Missing in data/derived: $($missing -join ', '). The Features tab will be incomplete. Run: music-atlas -Data"
  }
  $target = Join-Path $frontend 'public/atlas'
  New-Item -ItemType Directory -Force $target | Out-Null
  foreach ($file in $files) {
    $source = Join-Path $derived $file
    if (Test-Path $source) { Copy-Item $source $target -Force }
  }
  Write-Host 'Copied feature data to frontend/public/atlas' -ForegroundColor DarkGray
}

Push-Location $root
try {
  if ($Check) {
    Push-Location $pipeline
    try {
      # --basetemp keeps pytest's temp files inside the project (some machines block the system temp).
      Invoke-Step 'pipeline: pytest' { uv run pytest -q -p no:cacheprovider --basetemp=.pytest_tmp }
      Invoke-Step 'pipeline: ruff check' { uv run ruff check . }
      Invoke-Step 'pipeline: ruff format --check' { uv run ruff format --check . }
    } finally {
      Remove-Item -Recurse -Force '.pytest_tmp' -ErrorAction SilentlyContinue
      Pop-Location
    }
    Push-Location $frontend
    try {
      Invoke-Step 'frontend: npm install' { npm install --no-audit --no-fund }
      Invoke-Step 'frontend: typecheck' { npm run typecheck }
      Invoke-Step 'frontend: lint' { npm run lint }
      Invoke-Step 'frontend: test' { npm run test }
      Invoke-Step 'frontend: build' { npm run build }
    } finally { Pop-Location }
    Write-Host 'All checks passed.' -ForegroundColor Green
    return
  }

  if ($Fetch) {
    Push-Location $pipeline
    try {
      $env:PYTHONIOENCODING = 'utf-8'
      Invoke-Step 'pipeline: fetch source data' { uv run python scripts/fetch_data.py }
    } finally { Pop-Location }
    return
  }

  if ($Data) {
    Import-DataDirectory
    Push-Location $pipeline
    try {
      # PYTHONPATH keeps src/ importable when the repo path has non-ASCII characters.
      $env:PYTHONPATH = 'src'
      $env:PYTHONIOENCODING = 'utf-8'
      Invoke-Step 'pipeline: build feature graph' { uv run python scripts/build_feature_graph.py $derived }
    } finally { Pop-Location }
  }

  if ($Docker) {
    if (-not (Test-Path (Join-Path $root '.env'))) { throw 'Docker needs .env with MUSIC_MAP_DATA_DIR (copy .env.example).' }
    Write-Host 'Serving on http://localhost:8080 (Ctrl+C to stop)' -ForegroundColor Green
    if (-not $NoOpen) { Start-Process 'http://localhost:8080' }
    docker compose up --build frontend
    return
  }

  Sync-FrontendData
  Push-Location $frontend
  try {
    if (-not (Test-Path 'node_modules')) { Invoke-Step 'frontend: npm install' { npm install --no-audit --no-fund } }
    # Typed array: a lone string would be splatted character by character.
    [string[]]$openFlag = if ($NoOpen) { @() } else { @('--open') }
    Write-Host "Dev server on http://localhost:$Port (Ctrl+C to stop)" -ForegroundColor Green
    npm run dev -- --port $Port --strictPort @openFlag
  } finally { Pop-Location }
} finally {
  Pop-Location
}
