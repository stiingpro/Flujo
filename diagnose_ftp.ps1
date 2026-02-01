param(
    [string]$FtpHost = "ma5rmm.ftp.infomaniak.com",
    [string]$Username = "ma5rmm_system",
    [string]$PasswordPlain = "_Kcsp1101",
    [string]$RemotePath = "/sites/"
)

$Uri = "ftp://$FtpHost$RemotePath/"
$Request = [System.Net.FtpWebRequest]::Create($Uri)
$Request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
$Request.Credentials = New-Object System.Net.NetworkCredential($Username, $PasswordPlain)
$Request.UseBinary = $true
$Request.UsePassive = $true
$Request.KeepAlive = $false

try {
    Write-Host "Conectando a $Uri ..." -ForegroundColor Cyan
    $Response = $Request.GetResponse()
    $Stream = $Response.GetResponseStream()
    $Reader = New-Object System.IO.StreamReader($Stream)
    $Listing = $Reader.ReadToEnd()
    
    Write-Host "--- CONTENIDO DEL SERVIDOR ---" -ForegroundColor Yellow
    Write-Host $Listing
    Write-Host "------------------------------" -ForegroundColor Yellow
    
    $Reader.Close()
    $Response.Close()
}
catch {
    Write-Error "Error al listar el directorio: $_"
}
