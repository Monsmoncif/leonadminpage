$tempDir = "dist_deploy"
$zipName = "leonadmin_deploy.zip"

Write-Host "Cleaning up previous build..."
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
if (Test-Path $zipName) { Remove-Item -Force $zipName }

Write-Host "Creating staging folder..."
New-Item -ItemType Directory -Path $tempDir | Out-Null

# List of folders/files to copy from root
$itemsToCopy = @(
    "app",
    "components",
    "lib",
    "models",
    "types",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "server.js"
)

foreach ($item in $itemsToCopy) {
    if (Test-Path $item) {
        Write-Host "Copying $item..."
        Copy-Item -Path $item -Destination "$tempDir/$item" -Recurse
    }
}

# Copy .env.production as .env
Write-Host "Setting up production .env..."
Copy-Item -Path ".env.production" -Destination "$tempDir/.env"

# Copy .next excluding cache
Write-Host "Copying .next (excluding cache)..."
New-Item -ItemType Directory -Path "$tempDir/.next" | Out-Null
Get-ChildItem -Path ".next" | Where-Object { $_.Name -ne "cache" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$tempDir/.next/$($_.Name)" -Recurse
}

# Copy backend excluding node_modules
Write-Host "Copying backend (excluding node_modules)..."
New-Item -ItemType Directory -Path "$tempDir/backend" | Out-Null
$backendItems = @("src", "dist", "package.json", "package-lock.json", "tsconfig.json", "nest-cli.json")
foreach ($bItem in $backendItems) {
    $bPath = "backend/$bItem"
    if (Test-Path $bPath) {
        Copy-Item -Path $bPath -Destination "$tempDir/backend/$bItem" -Recurse
    }
}
# Copy backend .env.production as backend/.env
Copy-Item -Path "backend/.env.production" -Destination "$tempDir/backend/.env"

Write-Host "Creating ZIP archive $zipName..."
Compress-Archive -Path "$tempDir/*" -DestinationPath $zipName -CompressionLevel Optimal

Write-Host "Cleaning up staging directory..."
Remove-Item -Recurse -Force $tempDir

$zipSize = (Get-Item $zipName).Length / 1MB
Write-Host "Done! Archive created: $zipName ($([math]::Round($zipSize, 2)) MB)"
