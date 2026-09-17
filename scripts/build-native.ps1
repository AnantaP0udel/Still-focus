$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot -Parent
$framework=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$metadata=Join-Path $env:WINDIR 'System32\WinMetadata'
$runtime=Join-Path $env:WINDIR 'Microsoft.NET\assembly\GAC_MSIL\System.Runtime\v4.0_4.0.0.0__b03f5f7f11d50a3a\System.Runtime.dll'
& (Join-Path $framework 'csc.exe') /nologo /target:exe "/out:$(Join-Path $repoRoot 'native\SpotifyControl.exe')" "/reference:$(Join-Path $metadata 'Windows.Media.winmd')" "/reference:$(Join-Path $metadata 'Windows.Foundation.winmd')" "/reference:$(Join-Path $metadata 'Windows.Storage.winmd')" "/reference:$runtime" /reference:System.Web.Extensions.dll (Join-Path $repoRoot 'native\SpotifyControl.cs')
if($LASTEXITCODE -ne 0){throw 'Spotify desktop helper compilation failed.'}
