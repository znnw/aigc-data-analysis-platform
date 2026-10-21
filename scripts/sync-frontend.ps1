[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Source
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$sourceRoot = (Resolve-Path -LiteralPath $Source).Path
$targetRoot = Join-Path $repoRoot 'frontend'

if (-not (Test-Path (Join-Path $sourceRoot 'package.json'))) {
  throw "Source is not a frontend project: $sourceRoot"
}

if (-not (Test-Path $targetRoot)) {
  New-Item -ItemType Directory -Path $targetRoot | Out-Null
}

robocopy $sourceRoot $targetRoot /E `
  /XD "$sourceRoot\node_modules" "$sourceRoot\dist" "$sourceRoot\.runtime" `
      "$sourceRoot\.m2repository" "$sourceRoot\.pnpm-store" `
      "$sourceRoot\src\.umi" "$sourceRoot\src\.umi-production" `
  /XF '.eslintcache' `
  /NFL /NDL /NJH /NJS /NP

if ($LASTEXITCODE -ge 8) {
  throw "Frontend sync failed with robocopy exit code $LASTEXITCODE"
}

Write-Host "Frontend source synced to $targetRoot" -ForegroundColor Green
