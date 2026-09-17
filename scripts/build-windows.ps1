param(
    [string]$RuntimeZip
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot 'build-native.ps1')
$version = '42.11.4'
$expectedSha256 = '0DB8FD8D1CD0366B90161480D332527CF427EEF953891AE3E067606A572F46C4'
$distRoot = Join-Path $repoRoot 'dist'
$packageRoot = Join-Path $distRoot 'Still-Windows'
$cacheRoot = Join-Path $repoRoot '.build-cache'
New-Item -ItemType Directory -Path $distRoot, $cacheRoot -Force | Out-Null
if (-not $RuntimeZip) {
    $RuntimeZip = Join-Path $cacheRoot "electron-v$version-win32-x64.zip"
    if (-not (Test-Path -LiteralPath $RuntimeZip)) {
        Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/electron-v$version-win32-x64.zip" -OutFile $RuntimeZip
    }
}
if ((Get-FileHash -LiteralPath $RuntimeZip -Algorithm SHA256).Hash -ne $expectedSha256) {
    throw 'Electron runtime checksum mismatch. The archive was not used.'
}
# Preserve existing session data.
if (Test-Path -LiteralPath $packageRoot) {
    throw 'dist/Still-Windows already exists. Move that folder elsewhere before rebuilding.'
}
Expand-Archive -LiteralPath $RuntimeZip -DestinationPath $packageRoot
Rename-Item -LiteralPath (Join-Path $packageRoot 'electron.exe') -NewName 'Still.exe'
$appRoot = Join-Path $packageRoot 'resources/app'
New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
foreach ($name in @('package.json', 'main.js', 'engine.js', 'preload.js', 'renderer.js', 'index.html', 'style.css', 'spotify.js', 'spotify-api.js', 'music-ui.js', 'native', 'extension')) {
    Copy-Item -LiteralPath (Join-Path $repoRoot $name) -Destination $appRoot -Recurse
}
Copy-Item -LiteralPath (Join-Path $repoRoot 'README.md') -Destination (Join-Path $packageRoot 'START-HERE.md')
$archive = Join-Path $distRoot 'Still-Windows-x64.zip'
Compress-Archive -LiteralPath $packageRoot -DestinationPath $archive -Force
$checksum = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $distRoot 'SHA256SUMS.txt') -Value "$checksum  Still-Windows-x64.zip" -Encoding ascii
Write-Host "Built $archive"
