# PowerShell script for deploying contracts to Base Sepolia testnet
# This script helps with the deployment process and environment setup

Write-Host "🚀 Starting contract deployment process for Base Sepolia testnet" -ForegroundColor Green

# Check if .env.deploy exists
if (-not (Test-Path .env.deploy)) {
    Write-Host "❌ .env.deploy file not found. Creating template..." -ForegroundColor Red
    Copy-Item .env.example .env.deploy
    Write-Host "⚠️  Please edit .env.deploy with your private key and other settings before continuing." -ForegroundColor Yellow
    Write-Host "   You need to add your wallet's private key to deploy contracts." -ForegroundColor Yellow
    exit 1
}

# Prompt for confirmation
Write-Host "⚠️  WARNING: You are about to deploy contracts to Base Sepolia testnet." -ForegroundColor Yellow
Write-Host "   This will use real gas from your wallet." -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "Deployment aborted." -ForegroundColor Red
    exit 1
}

# Check if the user has Base Sepolia ETH
Write-Host "ℹ️  Make sure your wallet has Base Sepolia ETH for gas." -ForegroundColor Cyan
Write-Host "   You can get testnet ETH from https://www.coinbase.com/faucets/base-sepolia-faucet" -ForegroundColor Cyan
$hasEth = Read-Host "Do you have Base Sepolia ETH in your wallet? (y/n)"

if ($hasEth -ne "y") {
    Write-Host "❌ Please get Base Sepolia ETH before deploying." -ForegroundColor Red
    exit 1
}

# Run the deployment
Write-Host "🔄 Deploying contracts to Base Sepolia testnet..." -ForegroundColor Cyan
npx hardhat run scripts/deploy-sepolia.ts --network baseSepolia

# Check if deployment was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

# Verify the deployment
Write-Host "✅ Contracts deployed successfully!" -ForegroundColor Green
Write-Host "🔍 Checking .env.staging for updated contract addresses..." -ForegroundColor Cyan

# Display the contract addresses
if (Test-Path .env.staging) {
    $envContent = Get-Content .env.staging -Raw
    $dexAddressMatch = $envContent -match "NEXT_PUBLIC_LIMIT_ORDER_DEX_ADDRESS=(.*)"
    $dexAddress = if ($dexAddressMatch) { $Matches[1] } else { "Not found" }
    
    $keeperAddressMatch = $envContent -match "NEXT_PUBLIC_LIMIT_ORDER_KEEPER_ADDRESS=(.*)"
    $keeperAddress = if ($keeperAddressMatch) { $Matches[1] } else { "Not found" }
    
    Write-Host "📄 Contract Addresses:" -ForegroundColor Green
    Write-Host "   LimitOrderDEX: $dexAddress" -ForegroundColor Cyan
    Write-Host "   LimitOrderKeeper: $keeperAddress" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  .env.staging file not found. Contract addresses were not saved." -ForegroundColor Yellow
}

# Next steps
Write-Host "🔄 Next steps:" -ForegroundColor Green
Write-Host "1. Verify your contracts on Base Sepolia Explorer" -ForegroundColor Cyan
Write-Host "2. Run the staging deployment: npm run deploy:staging" -ForegroundColor Cyan
Write-Host "3. Test your application with the deployed contracts" -ForegroundColor Cyan 