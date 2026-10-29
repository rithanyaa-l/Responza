<#
.SYNOPSIS
  Starts MongoDB and the Scrum Attendance Tracker backend (which also serves the frontend).

.DESCRIPTION
  Database files and logs are kept outside the project, in SCRUM_DATA_DIR
  (default: %LOCALAPPDATA%\ScrumAttendance). MongoDB keeps running in the background after
  the server stops; run scripts\stop.ps1 to stop it.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\start.ps1
#>
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"
$dataRoot = if ($env:SCRUM_DATA_DIR) { $env:SCRUM_DATA_DIR } else { Join-Path $env:LOCALAPPDATA "ScrumAttendance" }
$dbPath = Join-Path $dataRoot "db"
$logDir = Join-Path $dataRoot "logs"
$programs = Join-Path $env:LOCALAPPDATA "Programs"

function Find-Tool([string]$pattern, [string]$name) {
  $dir = Get-ChildItem $programs -Directory -Filter $pattern -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
  if (-not $dir) { throw "$name not found in $programs" }
  return $dir.FullName
}

function Test-Port([int]$port) {
  try {
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect("127.0.0.1", $port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

$nodeDir = Find-Tool "node-v*-win-x64" "Node.js"
$mongoDir = Find-Tool "mongodb-win32-x86_64-*" "MongoDB"
$env:Path = "$nodeDir;$env:Path"

New-Item -ItemType Directory -Force $dbPath, $logDir | Out-Null

if (-not (Test-Port 27017)) {
  Write-Host "Starting MongoDB (data in $dbPath)..."
  $mongod = Join-Path $mongoDir "bin\mongod.exe"
  $mongoArgs = "--dbpath `"$dbPath`" --bind_ip 127.0.0.1 --port 27017 --logpath `"$logDir\mongod.log`" --logappend"
  Start-Process -FilePath $mongod -ArgumentList $mongoArgs -WindowStyle Hidden
  for ($i = 0; $i -lt 30 -and -not (Test-Port 27017); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-Port 27017)) { throw "MongoDB did not start; see $logDir\mongod.log" }
}

if (-not (Test-Path (Join-Path $backendDir "node_modules\mongodb"))) {
  Write-Host "Installing backend packages..."
  Push-Location $backendDir
  try { npm.cmd ci --omit=dev --no-audit --no-fund } finally { Pop-Location }
}

Push-Location $backendDir
try { node src/server.js } finally { Pop-Location }
