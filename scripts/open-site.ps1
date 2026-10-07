$ErrorActionPreference = "Stop"

$siteRoot = Split-Path -Parent $PSScriptRoot
$python = Get-Command python.exe -ErrorAction SilentlyContinue
$pythonArguments = @()

if ($python) {
  $pythonArguments = @("-m", "http.server")
} else {
  $python = Get-Command py.exe -ErrorAction SilentlyContinue
  if (-not $python) {
    throw "Python was not found. Install Python or add python.exe to PATH."
  }

  $pythonArguments = @("-3", "-m", "http.server")
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()

$arguments = $pythonArguments + @("$port", "--bind", "127.0.0.1")
$server = Start-Process `
  -FilePath $python.Source `
  -ArgumentList $arguments `
  -WorkingDirectory $siteRoot `
  -WindowStyle Hidden `
  -PassThru

$url = "http://127.0.0.1:$port/page/index.html"
$ready = $false

for ($attempt = 0; $attempt -lt 24; $attempt++) {
  if ($server.HasExited) {
    throw "The local web server exited before it became available."
  }

  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -eq 200 -and $response.Content.Contains("Adrastea")) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 250
  }
}

if (-not $ready) {
  Stop-Process -Id $server.Id
  throw "The local web server did not respond at $url."
}

Start-Process $url
Write-Output "Opened $url in your default browser. The local server is running as process $($server.Id)."
