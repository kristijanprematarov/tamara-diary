# Build Angular app and copy output to API wwwroot

# Build Angular app and copy output to API wwwroot/browser
param(
    [string]$ApiBrowser = "..\TamaraDiary.API\TamaraDiary.API\wwwroot\browser"
)

Write-Host "Building Angular app..."
npm install
npm run build -- --configuration production

# Find dist output
$distRoot = "dist/tamara-diary"
$distBrowser = Join-Path $distRoot "browser"
if (Test-Path $distBrowser) {
    $src = $distBrowser
} elseif (Test-Path $distRoot) {
    $src = $distRoot
} else {
    Write-Error "Angular dist folder not found at $distRoot or $distBrowser"
    exit 1
}

Write-Host "Copying built files from $src to $ApiBrowser..."
if (-not (Test-Path $ApiBrowser)) { New-Item -ItemType Directory -Path $ApiBrowser | Out-Null }
Copy-Item -Path (Join-Path $src '*') -Destination $ApiBrowser -Recurse -Force
Write-Host "Done."
