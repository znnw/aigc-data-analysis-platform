param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot ".local"
$mysqlRoot = Join-Path $localRoot "mysql"
$mysqlData = Join-Path $mysqlRoot "data"
$logRoot = Join-Path $localRoot "logs"
$mysqlBase = "C:\Program Files\MySQL\MySQL Server 8.0"
$mysqlExe = Join-Path $mysqlBase "bin\mysql.exe"
$mysqldExe = Join-Path $mysqlBase "bin\mysqld.exe"
$jdkHome = "D:\JAVA\JDK8"
$mavenExe = "E:\Maven3.6\Maven3.6.3\apache-maven-3.6.3\bin\mvn.cmd"
$localRepository = Join-Path $projectRoot ".m2repository"
$jarPath = Join-Path $projectRoot "target\aigc-data-analysis-backend-0.0.1-SNAPSHOT.jar"
$backendPort = 8081
$mysqlPort = 3307

function Test-TcpPort {
    param([string]$HostName, [int]$Port, [int]$TimeoutMilliseconds = 500)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne($TimeoutMilliseconds)) {
            return $false
        }
        $client.EndConnect($result)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Wait-TcpPort {
    param([string]$HostName, [int]$Port, [int]$TimeoutSeconds = 60)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort -HostName $HostName -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

Set-Location $projectRoot
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $mysqlExe) -or -not (Test-Path -LiteralPath $mysqldExe)) {
    throw "MySQL 8 was not found at $mysqlBase."
}

# MySQL does not handle the non-ASCII workspace path reliably on Windows.
# Map it to an ASCII drive letter before starting mysqld.
if (-not (Test-Path -LiteralPath "Y:\.local")) {
    if (Get-PSDrive -Name Y -ErrorAction SilentlyContinue) {
        throw "Drive Y: is already in use. Free it or change the drive letter in this script."
    }
    & subst.exe Y: $projectRoot
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to map Y: to the project directory."
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $mysqlData "mysql"))) {
    New-Item -ItemType Directory -Path $mysqlData -Force | Out-Null
    & $mysqldExe --initialize-insecure --basedir="$mysqlBase" --datadir="Y:\.local\mysql\data" --console
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to initialize the local MySQL data directory."
    }
}

if (-not (Test-TcpPort -HostName "127.0.0.1" -Port $mysqlPort)) {
    $mysqlArgs = @(
        "--basedir=`"$mysqlBase`"",
        "--datadir=Y:\.local\mysql\data",
        "--port=$mysqlPort",
        "--bind-address=127.0.0.1",
        "--mysqlx=0",
        "--pid-file=Y:\.local\mysql\mysqld.pid",
        "--console"
    )
    Start-Process -FilePath $mysqldExe `
        -ArgumentList $mysqlArgs `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $mysqlRoot "mysqld.out.log") `
        -RedirectStandardError (Join-Path $mysqlRoot "mysqld.err.log") | Out-Null

    if (-not (Wait-TcpPort -HostName "127.0.0.1" -Port $mysqlPort)) {
        throw "Local MySQL did not start. See $mysqlRoot\mysqld.err.log."
    }
}

$initSql = Join-Path $localRoot "init.sql"
Copy-Item -LiteralPath (Join-Path $projectRoot "sql\create_table.sql") -Destination $initSql -Force
& $mysqlExe -h 127.0.0.1 -P $mysqlPort -u root --default-character-set=utf8mb4 -e "source Y:/.local/init.sql"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to initialize the yubi database."
}

if (-not $SkipBuild -and -not (Test-Path -LiteralPath $jarPath)) {
    if (-not (Test-Path -LiteralPath $mavenExe)) {
        throw "Maven was not found at $mavenExe."
    }
    $env:JAVA_HOME = $jdkHome
    $env:Path = "$jdkHome\bin;$env:Path"
    & $mavenExe "-Dmaven.repo.local=$localRepository" -DskipTests package
    if ($LASTEXITCODE -ne 0) {
        throw "Maven build failed."
    }
}

if (-not (Test-Path -LiteralPath $jarPath)) {
    throw "Backend jar was not found. Run this script without -SkipBuild."
}

if (-not (Test-TcpPort -HostName "127.0.0.1" -Port $backendPort)) {
    $javaExe = Join-Path $jdkHome "bin\java.exe"
    if (-not (Test-Path -LiteralPath $javaExe)) {
        throw "JDK 8 was not found at $jdkHome."
    }

    $backendArgs = @("-jar", "`"$jarPath`"", "--spring.profiles.active=local")
    if ($env:YUAPI_CLIENT_ACCESS_KEY) {
        $backendArgs += "--yuapi.client.access-key=$env:YUAPI_CLIENT_ACCESS_KEY"
    }
    if ($env:YUAPI_CLIENT_SECRET_KEY) {
        $backendArgs += "--yuapi.client.secret-key=$env:YUAPI_CLIENT_SECRET_KEY"
    }

    $backend = Start-Process -FilePath $javaExe `
        -ArgumentList $backendArgs `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logRoot "backend.out.log") `
        -RedirectStandardError (Join-Path $logRoot "backend.err.log") `
        -PassThru
    Set-Content -LiteralPath (Join-Path $localRoot "backend.pid") -Value $backend.Id

    if (-not (Wait-TcpPort -HostName "127.0.0.1" -Port $backendPort -TimeoutSeconds 90)) {
        throw "Backend did not start. See $logRoot\backend.out.log."
    }
}

Write-Host "Backend: http://localhost:$backendPort/api"
Write-Host "API docs: http://localhost:$backendPort/api/doc.html"
Write-Host "Local MySQL: 127.0.0.1:$mysqlPort, database=yubi, user=root, password=(empty)"
