param(
  [switch]$NoNewWindow,
  [switch]$StopOnly
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "[restart-dev] Project root: $projectRoot"
Write-Host "[restart-dev] Stopping stale dev processes..."

# Stop all node processes that use this project (any dev-related command in this repo)
$nodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match [Regex]::Escape($projectRoot) -and
    (
      $_.CommandLine -match "next\s+dev" -or
      $_.CommandLine -match "convex\s+dev" -or
      $_.CommandLine -match "npm-run-all" -or
      $_.CommandLine -match "npm\s+run\s+dev" -or
      $_.CommandLine -match "node\.exe.*\bnext\b" -or
      $_.CommandLine -match "node\.exe.*\bconvex\b"
    )
  }

foreach ($proc in $nodeProcesses) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host "[restart-dev] Stopped PID $($proc.ProcessId)"
  } catch {
    Write-Host "[restart-dev] Skip PID $($proc.ProcessId): $($_.Exception.Message)"
  }
}

$nextLockPath = Join-Path $projectRoot ".next\dev\lock"
if (Test-Path $nextLockPath) {
  try {
    Remove-Item $nextLockPath -Force
    Write-Host "[restart-dev] Removed Next.js lock file"
  } catch {
    Write-Host "[restart-dev] Could not remove lock file: $($_.Exception.Message)"
  }
}

if ($StopOnly) {
  Write-Host "[restart-dev] StopOnly: done. Start handmatig met: npm run dev"
  exit 0
}

if ($NoNewWindow) {
  Write-Host "[restart-dev] Starting npm run dev in current terminal..."
  Set-Location $projectRoot
  npm run dev
  exit $LASTEXITCODE
}

Write-Host "[restart-dev] Starting npm run dev in a new PowerShell window..."
$command = "Set-Location '$projectRoot'; npm run dev"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $command) | Out-Null

Write-Host "[restart-dev] Done."
