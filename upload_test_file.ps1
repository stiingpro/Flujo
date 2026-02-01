param(
    [string]$FtpHost = "ma5rmm.ftp.infomaniak.com",
    [string]$Username = "ma5rmm_system",
    [string]$PasswordPlain = "_Kcsp1101",
    [string]$RemotePath = "/sites/FlujoGlobal.stiing.pro/test.txt"
)

$Uri = "ftp://$FtpHost$RemotePath"
$Request = [System.Net.FtpWebRequest]::Create($Uri)
$Request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
$Request.Credentials = New-Object System.Net.NetworkCredential($Username, $PasswordPlain)
$Request.UseBinary = $true
$Request.UsePassive = $true

$Content = "Hola desde Antigravity! Ruta correcta confirmado."
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($Content)
$Request.ContentLength = $Bytes.Length

try {
    Write-Host "Subiendo test.txt a $Uri ..." -ForegroundColor Cyan
    $Stream = $Request.GetRequestStream()
    $Stream.Write($Bytes, 0, $Bytes.Length)
    $Stream.Close()
    $Response = $Request.GetResponse()
    Write-Host "¡Archivo subido exitosamente!" -ForegroundColor Green
    $Response.Close()
}
catch {
    Write-Error "Error al subir test.txt: $_"
}
