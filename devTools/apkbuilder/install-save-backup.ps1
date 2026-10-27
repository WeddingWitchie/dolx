param(
    [Parameter(Mandatory = $true)]
    [string]$BuilderPath
)

$ErrorActionPreference = 'Stop'
$builder = (Resolve-Path -LiteralPath $BuilderPath).Path
$pluginName = 'cordova-plugin-dol-save-backup'
$source = Join-Path $PSScriptRoot $pluginName
$localPlugins = Join-Path $builder 'local-plugins'
$destination = Join-Path $localPlugins $pluginName
$cli = Join-Path $builder 'node_modules\cordova\bin\cordova'
if (!(Test-Path -LiteralPath (Join-Path $builder 'config.xml')) -or !(Test-Path -LiteralPath $cli)) {
    throw "Not a configured Cordova builder: $builder"
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $destination -Recurse -Force
Push-Location -LiteralPath $builder
try {
    $installed = if (Test-Path -LiteralPath 'plugins\fetch.json') {
        Get-Content -LiteralPath 'plugins\fetch.json' -Raw | ConvertFrom-Json
    } else { $null }
    if ($installed.PSObject.Properties.Name -contains $pluginName) {
        & node $cli plugin remove $pluginName --save --no-telemetry
        if ($LASTEXITCODE -ne 0) { throw 'Could not remove the previous backup plugin' }
    }
    & node $cli plugin add "./local-plugins/$pluginName" --save --nofetch --no-telemetry
    if ($LASTEXITCODE -ne 0) { throw 'Could not install the backup plugin' }
} finally {
    Pop-Location
}
