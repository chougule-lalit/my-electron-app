# Quick Build Script for Simple Invoice Generator
# This script helps you build the application step by step

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Simple Invoice Generator - Build Script  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Choose build option:" -ForegroundColor Green
Write-Host "1. Full Build (Installer + Portable) - Recommended" -ForegroundColor White
Write-Host "2. Quick Test Build (Unpacked only) - Faster" -ForegroundColor White
Write-Host "3. Portable Only" -ForegroundColor White
Write-Host "4. Installer Only" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Building full distribution..." -ForegroundColor Yellow
        Write-Host "This may take 5-10 minutes on first build..." -ForegroundColor Cyan
        npm run build
    }
    "2" {
        Write-Host ""
        Write-Host "Building unpacked version for testing..." -ForegroundColor Yellow
        npm run build:dir
    }
    "3" {
        Write-Host ""
        Write-Host "Building portable version only..." -ForegroundColor Yellow
        npm run build -- --win --x64 --config.win.target=portable
    }
    "4" {
        Write-Host ""
        Write-Host "Building installer only..." -ForegroundColor Yellow
        npm run build -- --win --x64 --config.win.target=nsis
    }
    "5" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Build Completed Successfully! ✓" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your files are in the 'dist' folder:" -ForegroundColor Cyan
    Write-Host "- Installer: Simple Invoice Generator Setup 1.0.0.exe" -ForegroundColor White
    Write-Host "- Portable: Simple Invoice Generator 1.0.0.exe" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Test the built application" -ForegroundColor White
    Write-Host "2. Share with users" -ForegroundColor White
    Write-Host "3. See BUILD_GUIDE.md for distribution tips" -ForegroundColor White
    Write-Host ""
    
    # Ask if user wants to open dist folder
    $openFolder = Read-Host "Open dist folder now? (Y/N)"
    if ($openFolder -eq "Y" -or $openFolder -eq "y") {
        explorer dist
    }
} else {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  Build Failed! ✗" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "1. Run: npm install" -ForegroundColor White
    Write-Host "2. Delete node_modules and dist folders, then reinstall" -ForegroundColor White
    Write-Host "3. Check BUILD_GUIDE.md for troubleshooting" -ForegroundColor White
    Write-Host ""
}

Read-Host "Press Enter to exit"
