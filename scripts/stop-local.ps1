$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot ".local"

function Stop-FromPidFile {
    param([string]$PidFile)

    if (-not (Test-Path -LiteralPath $PidFile)) {
        return
    }

    $processId = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue
    if ($processId) {
        Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

Stop-FromPidFile -PidFile (Join-Path $localRoot "backend.pid")
Stop-FromPidFile -PidFile (Join-Path $localRoot "mysql\mysqld.pid")

if (Test-Path -LiteralPath "Y:\.local") {
    & subst.exe Y: /D
}

Write-Host "Local backend and MySQL have been stopped."
