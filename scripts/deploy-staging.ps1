# PowerShell script for deploying to staging environment
# This script is designed for Windows environments

Write-Host "Starting deployment process for staging environment" -ForegroundColor Green

# Check if we're on the right branch (main)
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "main") {
    Write-Host "Warning: You're not on the main branch. Current branch: $currentBranch" -ForegroundColor Yellow
    $continue = Read-Host "Do you want to continue? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Deployment aborted." -ForegroundColor Red
        exit 1
    }
}

# Create environment-specific .env file
Write-Host "Setting up staging environment variables" -ForegroundColor Cyan
Copy-Item .env.staging .env.local -Force

# Install dependencies
Write-Host "Installing dependencies" -ForegroundColor Cyan
npm ci

# Run tests
Write-Host "Running tests" -ForegroundColor Cyan
npm test

# Check if tests passed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tests failed. Aborting deployment." -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "Building the application for staging" -ForegroundColor Cyan
npm run build

# Check if build succeeded
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting deployment." -ForegroundColor Red
    exit 1
}

# Deploy to staging
# Replace this with your actual deployment command
Write-Host "Deploying to staging" -ForegroundColor Green
# Example: vercel --confirm

Write-Host "Deployment completed successfully!" -ForegroundColor Green

# Instructions for verification
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify the deployment at your staging URL" -ForegroundColor Cyan
Write-Host "2. Run integration tests: npm run test:integration" -ForegroundColor Cyan
Write-Host "3. Perform manual testing of key features" -ForegroundColor Cyan 