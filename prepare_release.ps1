$ErrorActionPreference = "Stop"
$ProjectRoot = "d:\ANTIGRAVITY\flujoglobal"
$ReleaseDir = "$ProjectRoot\release"
$StandaloneDir = "$ProjectRoot\.next\standalone\flujoglobal" # Adjusted for workspace structure
$StaticDir = "$ProjectRoot\.next\static"
$PublicDir = "$ProjectRoot\public"

Write-Host "Preparando carpeta 'release' para despliegue Node.js..." -ForegroundColor Cyan

# 1. Clean release dir
if (Test-Path $ReleaseDir) { Remove-Item $ReleaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
New-Item -ItemType Directory -Path "$ReleaseDir\.next\static" -Force | Out-Null

# 2. Copy Standalone Content (Server logic)
Write-Host "Copiando archivos del servidor..." -ForegroundColor Yellow
Copy-Item "$StandaloneDir\*" "$ReleaseDir\" -Recurse -Force

# 3. Copy Static Assets (JS chunks, CSS) - REQUIRED for UI to work
Write-Host "Copiando assets estáticos (.next/static)..." -ForegroundColor Yellow
Copy-Item "$StaticDir\*" "$ReleaseDir\.next\static\" -Recurse -Force

# 4. Copy Public Folder (Images, fonts)
Write-Host "Copiando carpeta public..." -ForegroundColor Yellow
if (Test-Path $PublicDir) {
    Copy-Item "$PublicDir" "$ReleaseDir\" -Recurse -Force
}

# 5. Create a simple ecosystem.config.js (Optional, helpfull for PM2 commonly used in hosting)
$EcosystemContent = @"
module.exports = {
  apps : [{
    name   : "flujoglobal",
    script : "server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
"@
Set-Content -Path "$ReleaseDir\ecosystem.config.js" -Value $EcosystemContent

Write-Host "------------------------------------------------"
Write-Host "¡CARPETA 'release' CREADA!" -ForegroundColor Green
Write-Host "Sube el CONTENIDO de: $ReleaseDir"
Write-Host "al servidor y apunta 'Startup File' a: server.js"
Write-Host "------------------------------------------------"
