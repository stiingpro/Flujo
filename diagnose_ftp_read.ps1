param(
    [string]$FtpHost = "ma5rmm.ftp.infomaniak.com",
    [string]$Username = "ma5rmm_system",
    [string]$PasswordPlain = "_Kcsp1101",
    [string]$RemotePath = "/ik-logs/error.log"
)

$Uri = "ftp://$FtpHost$RemotePath"
$Request = [System.Net.FtpWebRequest]::Create($Uri)
$Request.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
$Request.Credentials = New-Object System.Net.NetworkCredential($Username, $PasswordPlain)
$Request.UseBinary = $true
$Request.UsePassive = $true

try {
    Write-Host "Descargando log de $Uri ..." -ForegroundColor Cyan
    $Response = $Request.GetResponse()
    $Stream = $Response.GetResponseStream()
    $Reader = New-Object System.IO.StreamReader($Stream)
    $Content = $Reader.ReadToEnd()
    
    Write-Host "--- CONTENIDO DEL LOG (Últimas 50 líneas) ---" -ForegroundColor Yellow
    # Split by newline and take last 50
    $Lines = $Content -split "`n"
    $LastLines = $Lines | Select-Object -Last 50
    $LastLines
    Write-Host "---------------------------------------------" -ForegroundColor Yellow
    
    $Reader.Close()
    $Response.Close()
}
catch {
    Write-Error "Error al leer el archivo: $_"
}
