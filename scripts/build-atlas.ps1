<#
.SYNOPSIS
  Prepare the Music Atlas development environment from a fresh checkout.

.DESCRIPTION
  Checks the required tools, creates .env from .env.example when missing, installs the
  pipeline (uv sync) and frontend (npm install) dependencies. Safe to re-run.
  Run from anywhere; paths are resolved from this script's location.

.PARAMETER Data
  Also download the MTG-Jamendo source data (about 1.4 GB, once) and build the feature
  export in data/derived. Needs MUSIC_MAP_DATA_DIR in .env or the environment.
.PARAMETER Check
  Run the full definition-of-done checks after installing.
#>
[CmdletBinding()]
param(
  [switch]$Data,
  [switch]$Check
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pipeline = Join-Path $root 'pipeline'
$frontend = Join-Path $root 'frontend'
$runScript = Join-Path $PSScriptRoot 'music-atlas.ps1'

function Invoke-Step([string]$Title, [scriptblock]$Command) {
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Step failed (exit code $LASTEXITCODE): $Title" }
}

function Assert-Tool([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "'$Name' not found. $Hint" }
}

Assert-Tool 'uv' 'Install it from https://docs.astral.sh/uv/ (it also provides Python 3.12).'
Assert-Tool 'node' 'Install Node 24 from https://nodejs.org/.'
Assert-Tool 'npm' 'It ships with Node.'
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 24) { Write-Warning "Node 24 is expected, found $(node --version)." }

$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root '.env.example') $envFile
  Write-Warning "Created .env from .env.example. Set MUSIC_MAP_DATA_DIR in $envFile before using -Data."
}

Push-Location $root
try {
  Push-Location $pipeline
  try {
    Invoke-Step 'pipeline: uv sync' { uv sync }
  } finally { Pop-Location }

  Push-Location $frontend
  try {
    Invoke-Step 'frontend: npm install' { npm install --no-audit --no-fund }
  } finally { Pop-Location }

  if ($Data) {
    # -Fetch downloads the sources and exits; -Data builds the export, then starts the dev server,
    # so build the export through the pipeline script directly instead.
    & $runScript -Fetch
    Push-Location $pipeline
    try {
      $env:PYTHONPATH = 'src'
      $env:PYTHONIOENCODING = 'utf-8'
      Invoke-Step 'pipeline: build feature graph' { uv run python scripts/build_feature_graph.py ../data/derived }
    } finally { Pop-Location }
  }

  if ($Check) { & $runScript -Check }
} finally {
  Pop-Location
}

Write-Host 'Environment ready. Start the app with: music-atlas' -ForegroundColor Green
