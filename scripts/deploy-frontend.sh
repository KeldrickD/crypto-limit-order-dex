#!/bin/bash

# Frontend Deployment Script for Crypto Limit Order DEX
# This script helps deploy the application to staging or production environments

# Exit on error
set -e

# Default environment is staging
ENVIRONMENT=${1:-staging}
BUILD_DIR="build"
DEPLOY_BRANCH="main"

echo "🚀 Starting deployment process for $ENVIRONMENT environment"

# Check if we're on the right branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
  echo "⚠️  Warning: You're not on the $DEPLOY_BRANCH branch. Current branch: $CURRENT_BRANCH"
  read -p "Do you want to continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment aborted."
    exit 1
  fi
fi

# Create environment-specific .env file
if [ "$ENVIRONMENT" = "production" ]; then
  echo "🔧 Setting up production environment variables"
  cp .env.production .env.local
else
  echo "🔧 Setting up staging environment variables"
  cp .env.staging .env.local
fi

# Install dependencies
echo "📦 Installing dependencies"
npm ci

# Run tests
echo "🧪 Running tests"
npm test

# Build the application
echo "🏗️  Building the application for $ENVIRONMENT"
npm run build

# Run additional checks if needed
if [ "$ENVIRONMENT" = "production" ]; then
  echo "🔍 Running additional production checks"
  # Add any production-specific checks here
fi

# Deploy instructions based on environment
if [ "$ENVIRONMENT" = "production" ]; then
  echo "🚀 Deploying to production"
  # Add your production deployment command here
  # Example: vercel --prod
else
  echo "🚀 Deploying to staging"
  # Add your staging deployment command here
  # Example: vercel
fi

echo "✅ Deployment completed successfully!" 