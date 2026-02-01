param(
    [Parameter(Mandatory = $true, HelpMessage = "El host FTP (ej: ftp.infomaniak.com)")][string]$FtpHost,
    [Parameter(Mandatory = $true, HelpMessage = "Tu usuario FTP")][string]$Username,
    [Parameter(Mandatory = $true, HelpMessage = "Tu contraseña FTP")][SecureString]$Password,
    [Parameter(Mandatory = $false, HelpMessage = "Carpeta remota (ej: /web o /public_html). Deja vacío para la raíz.")][string]$RemotePath = "/"
)

$ErrorActionPreference = "Stop"
$LocalPath = "$PSScriptRoot\release"

# Convert SecureString to plain text for WebClient
$Ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($Password)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($Ptr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($Ptr)

if (-not (Test-Path $LocalPath)) {
    Write-Error "La carpeta 'release' no existe. Ejecuta '.\prepare_release.ps1' primero."
    exit 1
}

# Clean remote path formatting
if (-not $RemotePath.StartsWith("/")) { $RemotePath = "/" + $RemotePath }
if (-not $RemotePath.EndsWith("/")) { $RemotePath += "/" }

Write-Host "INICIANDO DESPLIEGUE A: ftp://$FtpHost$RemotePath" -ForegroundColor Cyan
Write-Host "---------------------------------------------------"

# 1. Gather all files and folders
$Directories = Get-ChildItem -Path $LocalPath -Recurse -Directory | Sort-Object { $_.FullName.Length }
$Files = Get-ChildItem -Path $LocalPath -Recurse -File

# 2. Create remote directories
Write-Host "Verificando estructura de carpetas..." -ForegroundColor Yellow
foreach ($dir in $Directories) {
    $relativePath = $dir.FullName.Substring($LocalPath.Length).Replace("\", "/")
    # Ensure relative path starts with /
    if (-not $relativePath.StartsWith("/")) { $relativePath = "/" + $relativePath }
    
    $fullRemoteUrl = "ftp://$FtpHost$RemotePath$relativePath"
    
    # Remove double slashes if any (except ftp://)
    $fullRemoteUrl = $fullRemoteUrl -replace "(?<!:)/+", "/"
    
    try {
        $request = [System.Net.WebRequest]::Create($fullRemoteUrl)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $request.Credentials = New-Object System.Net.NetworkCredential($Username, $PlainPassword)
        $request.GetResponse() | Out-Null
        Write-Host " + Carpeta creada: $relativePath" -ForegroundColor Gray
    }
    catch {
        # 550 usually means directory already exists, which is fine
        $resp = $_.Exception.Response
        if ($null -ne $resp -and $resp.StatusCode -eq [System.Net.FtpStatusCode]::ActionNotTakenFileUnavailable) {
            # Directory exists
        }
        else {
            Write-Warning "No se pudo crear carpeta $relativePath ($($_.Exception.Message))"
        }
    }
}

# 3. Upload files
Write-Host "`nSubiendo archivos..." -ForegroundColor Yellow
$count = 0
$total = $Files.Count

foreach ($file in $Files) {
    $count++
    $relativePath = $file.FullName.Substring($LocalPath.Length).Replace("\", "/")
    if (-not $relativePath.StartsWith("/")) { $relativePath = "/" + $relativePath }
    
    $fullRemoteUrl = "ftp://$FtpHost$RemotePath$relativePath"
    $fullRemoteUrl = $fullRemoteUrl -replace "(?<!:)/+", "/"

    $percent = "{0:N0}" -f (($count / $total) * 100)
    Write-Host " [$percent%] Subiendo: $relativePath" -NoNewline

    try {
        $client = New-Object System.Net.WebClient
        $client.Credentials = New-Object System.Net.NetworkCredential($Username, $PlainPassword)
        $client.UploadFile($fullRemoteUrl, "STOR", $file.FullName) | Out-Null
        Write-Host " [OK]" -ForegroundColor Green
    }
    catch {
        Write-Host " [ERROR]" -ForegroundColor Red
        Write-Error "Fallo al subir $relativePath : $($_.Exception.Message)" -ErrorAction Continue
    }
}

Write-Host "---------------------------------------------------"
Write-Host "¡DESPLIEGUE COMPLETADO EXITOSAMENTE!" -ForegroundColor Cyan
