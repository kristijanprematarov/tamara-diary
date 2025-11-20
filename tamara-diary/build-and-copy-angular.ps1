# Build Angular app and copy output to API wwwroot
param(
    [string]$ApiRoot = "..\TamaraDiary.API\TamaraDiary.API\wwwroot"
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

Write-Host "Copying built files from $src to $ApiRoot..."
if (-not (Test-Path $ApiRoot)) { New-Item -ItemType Directory -Path $ApiRoot | Out-Null }
Copy-Item -Path (Join-Path $src '*') -Destination $ApiRoot -Recurse -Force
Write-Host "Done."
