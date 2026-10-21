[CmdletBinding()]
param(
  [switch]$RebuildBackend,
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'
$frontendRoot = $PSScriptRoot
$parentRoot = Split-Path $frontendRoot -Parent
$workspaceRoot = Split-Path $parentRoot -Parent
$backendSource = if (Test-Path (Join-Path $parentRoot 'pom.xml')) {
  $parentRoot
} else {
  Get-ChildItem -Path $workspaceRoot -Directory |
    ForEach-Object { Join-Path $_.FullName 'aigc-data-analysis-backend' } |
    Where-Object { Test-Path (Join-Path $_ 'pom.xml') } |
    Select-Object -First 1
}
if (-not $backendSource) {
  throw 'Backend project could not be located.'
}
$runtimeRoot = Join-Path $frontendRoot '.runtime'
$backendBuild = Join-Path $runtimeRoot 'backend-build'
$logRoot = Join-Path $runtimeRoot 'logs'
$nodeExe = Join-Path $runtimeRoot 'node-v18.20.8-win-x64\node.exe'
$javaExe = 'D:\JAVA\JDK8\bin\java.exe'
$mavenRepo = Join-Path $backendSource '.m2repository'
$mysqlBase = 'C:\Program Files\MySQL\MySQL Server 8.0'
$mysqlExe = Join-Path $mysqlBase 'bin\mysql.exe'
$mysqlAdmin = Join-Path $mysqlBase 'bin\mysqladmin.exe'
$legacyMysqlRoot = 'D:\AIGC-yubi-runtime'
$mysqlData = if (Test-Path (Join-Path $legacyMysqlRoot 'mysql-data')) {
  Join-Path $legacyMysqlRoot 'mysql-data'
} else {
  Join-Path $runtimeRoot 'mysql-data'
}
$mysqlLogs = if (Test-Path (Join-Path $legacyMysqlRoot 'logs')) {
  Join-Path $legacyMysqlRoot 'logs'
} else {
  Join-Path $logRoot 'mysql'
}

New-Item -ItemType Directory -Force -Path $runtimeRoot, $logRoot | Out-Null

function Test-LocalPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $client.Connect('127.0.0.1', $Port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-HttpReady([string]$Url) {
  $status = & curl.exe -s -o NUL -w '%{http_code}' --max-time 2 $Url 2>$null
  return $status -eq '200'
}

function Wait-Until([scriptblock]$Condition, [int]$Seconds, [string]$ErrorMessage) {
  for ($i = 0; $i -lt $Seconds; $i++) {
    if (& $Condition) {
      return
    }
    Start-Sleep -Seconds 1
  }
  throw $ErrorMessage
}

if (-not (Test-LocalPort 3307)) {
  New-Item -ItemType Directory -Force -Path $mysqlData, $mysqlLogs | Out-Null
  if (-not (Test-Path (Join-Path $mysqlData 'mysql'))) {
    & (Join-Path $mysqlBase 'bin\mysqld.exe') --no-defaults --initialize-insecure `
      "--basedir=$mysqlBase" "--datadir=$mysqlData" "--lc-messages-dir=$mysqlBase\share"
  }
  Start-Process -FilePath (Join-Path $mysqlBase 'bin\mysqld.exe') -ArgumentList @(
    '--no-defaults',
    "--basedir=`"$mysqlBase`"",
    "--datadir=`"$mysqlData`"",
    "--lc-messages-dir=`"$mysqlBase\share`"",
    '--port=3307',
    '--bind-address=127.0.0.1',
    '--mysqlx=0',
    "--log-error=`"$(Join-Path $mysqlLogs 'mysql.err.log')`""
  ) -WindowStyle Hidden | Out-Null
  Wait-Until { Test-LocalPort 3307 } 30 'Project MySQL did not start on port 3307.'
}

& $mysqlAdmin --protocol=TCP --host=127.0.0.1 --port=3307 --user=root ping | Out-Null
# The backend datasource still uses this schema identifier.
$databaseName = 'yubi'
$databaseExists = & $mysqlExe --protocol=TCP --host=127.0.0.1 --port=3307 --user=root `
  --batch --skip-column-names --execute="show databases like '$databaseName'" 2>$null
if ($databaseExists -ne $databaseName) {
  $sqlDrive = 'Y:'
  $createdSqlMapping = $false
  if (-not (Test-Path -LiteralPath "$sqlDrive\")) {
    if (Get-PSDrive -Name Y -ErrorAction SilentlyContinue) {
      throw 'Drive Y: is already in use.'
    }
    & subst.exe Y: $backendSource
    if ($LASTEXITCODE -ne 0) { throw 'Failed to map backend source to Y:.' }
    $createdSqlMapping = $true
  }
  try {
    & $mysqlExe --protocol=TCP --host=127.0.0.1 --port=3307 --user=root --default-character-set=utf8mb4 --execute="source Y:/sql/create_table.sql"
    if ($LASTEXITCODE -ne 0) { throw 'Database schema import failed.' }
  } finally {
    if ($createdSqlMapping -and (Test-Path -LiteralPath 'Y:\')) {
      & subst.exe Y: /D | Out-Null
    }
  }
}
$adminHash = '1643fafa56ef5429060f1c36c2223681'
& $mysqlExe --protocol=TCP --host=127.0.0.1 --port=3307 --user=root `
  --default-character-set=utf8mb4 --execute="use $databaseName; insert into user(userAccount,userPassword,userName,userRole) select 'admin','$adminHash',convert(0xE7AEA1E79086E59198 using utf8mb4),'admin' where not exists (select 1 from user where userAccount='admin');"

$jar = Join-Path $backendBuild 'target\aigc-data-analysis-backend-0.0.1-SNAPSHOT.jar'
$latestSource = Get-ChildItem (Join-Path $backendSource 'src') -Recurse -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$needBuild = $RebuildBackend -or -not (Test-Path $jar) -or $latestSource.LastWriteTime -gt (Get-Item $jar).LastWriteTime
if ($needBuild) {
  if (Test-LocalPort 8081) {
    throw 'The backend is running. Stop the process on port 8081 before using -RebuildBackend.'
  }
  New-Item -ItemType Directory -Force -Path $backendBuild | Out-Null
  foreach ($generatedPath in @((Join-Path $backendBuild 'src'), (Join-Path $backendBuild 'target'))) {
    if (Test-Path -LiteralPath $generatedPath) {
      $resolvedGeneratedPath = (Resolve-Path -LiteralPath $generatedPath).Path
      if (-not $resolvedGeneratedPath.StartsWith($backendBuild, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Generated path escaped backend build directory: $resolvedGeneratedPath"
      }
      Remove-Item -LiteralPath $resolvedGeneratedPath -Recurse -Force
    }
  }
  robocopy $backendSource $backendBuild /E /XD target .m2repository .idea .git /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "Backend sync failed. robocopy exit code: $LASTEXITCODE"
  }
  $repoLink = Join-Path $backendBuild '.m2repository'
  if (Test-Path -LiteralPath $repoLink) {
    $repoItem = Get-Item -LiteralPath $repoLink -Force
    if ($repoItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
      Remove-Item -LiteralPath $repoLink -Force
    }
  }
  New-Item -ItemType Junction -Path $repoLink -Target $mavenRepo | Out-Null
  $env:JAVA_HOME = 'D:\JAVA\JDK8'
  $env:Path = "D:\JAVA\JDK8\bin;$env:Path"
  Push-Location $backendBuild
  try {
    & mvn -o -DskipTests package
    if ($LASTEXITCODE -ne 0) {
      throw 'Backend build failed.'
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-HttpReady 'http://127.0.0.1:8081/api/user/get/login')) {
  Start-Process -FilePath $javaExe -ArgumentList @(
    '-jar',
    $jar,
    '--spring.profiles.active=local'
  ) -WorkingDirectory $backendBuild `
    -RedirectStandardOutput (Join-Path $logRoot 'backend-local.out.log') `
    -RedirectStandardError (Join-Path $logRoot 'backend-local.err.log') `
    -WindowStyle Hidden | Out-Null
  Wait-Until { Test-HttpReady 'http://127.0.0.1:8081/api/user/get/login' } 90 'Backend did not start on port 8081.'
}

if (-not (Test-HttpReady 'http://127.0.0.1:8000/user/login')) {
  if (-not (Test-Path $nodeExe)) {
    throw 'Project Node.js 18 runtime is missing. Check .runtime\node-v18.20.8-win-x64.'
  }
  $env:PATH = "$(Split-Path $nodeExe -Parent);$env:PATH"
  $env:REACT_APP_ENV = 'dev'
  $env:MOCK = 'none'
  $env:UMI_ENV = 'dev'
  $env:BROWSER = 'none'
  $env:PORT = '8000'
  Start-Process -FilePath $nodeExe -ArgumentList @(
    'node_modules\@umijs\max\bin\max.js',
    'dev',
    '--port',
    '8000'
  ) -WorkingDirectory $frontendRoot `
    -RedirectStandardOutput (Join-Path $logRoot 'frontend.out.log') `
    -RedirectStandardError (Join-Path $logRoot 'frontend.err.log') `
    -WindowStyle Hidden | Out-Null
  Wait-Until { Test-HttpReady 'http://127.0.0.1:8000/user/login' } 120 'Frontend did not start on port 8000.'
}

Write-Host ''
Write-Host 'Project is running:' -ForegroundColor Green
Write-Host '  Frontend:   http://localhost:8000'
Write-Host '  Backend:    http://localhost:8081/api'
Write-Host '  API docs:   http://localhost:8081/api/doc.html'
Write-Host '  Admin user: admin'
Write-Host '  Password:   admin123456'
Write-Host ''

if ($OpenBrowser) {
  Start-Process 'http://localhost:8000'
}
