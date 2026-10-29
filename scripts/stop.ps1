<#
.SYNOPSIS
  Stops the tracker's MongoDB cleanly (the backend itself stops with Ctrl+C in its window).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\stop.ps1
#>
$ErrorActionPreference = "Stop"

$backendDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backend"
$programs = Join-Path $env:LOCALAPPDATA "Programs"
$nodeDir = Get-ChildItem $programs -Directory -Filter "node-v*-win-x64" -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $nodeDir) { throw "Node.js not found in $programs" }

# ask MongoDB to shut itself down, which flushes data to disk first
$script = "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017',{serverSelectionTimeoutMS:3000});" +
  "try{await c.connect();await c.db('admin').command({shutdown:1})}catch(e){if(!/ECONNREFUSED|closed|interrupted/i.test(e.message)){console.error(e.message);process.exit(1)}}process.exit(0)})()"
Push-Location $backendDir
try { & (Join-Path $nodeDir.FullName "node.exe") -e $script } finally { Pop-Location }
Write-Host "MongoDB stopped."
