# Deployment Guide for Crypto Limit Order DEX

This document outlines the steps to deploy the Crypto Limit Order DEX application to staging and production environments.

## Prerequisites

- Node.js 18+ and npm 9+
- Git access to the repository
- Access credentials for deployment platforms
- Environment variables configured for each environment

## Environment Setup

1. **Environment Files**:
   - `.env.staging`: Configuration for the staging environment
   - `.env.production`: Configuration for the production environment
   
   Ensure these files are properly configured with the correct values for each environment.

2. **Required Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: API endpoint URL
   - `NEXT_PUBLIC_LIMIT_ORDER_DEX_ADDRESS`: Deployed contract address
   - `NEXT_PUBLIC_LIMIT_ORDER_KEEPER_ADDRESS`: Keeper contract address
   - `NEXT_PUBLIC_CHAIN_ID`: Target blockchain network ID
   - `NEXT_PUBLIC_RPC_URL`: RPC endpoint for the blockchain
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID
   - `NEXT_PUBLIC_SENTRY_DSN`: Sentry DSN for error tracking (optional)

## Deployment Process

### Staging Deployment

1. **Prepare for Deployment**:
   ```bash
   # Run the deployment script for staging
   bash scripts/deploy-frontend.sh staging
   ```

2. **Verify Staging Deployment**:
   - Access the staging URL and verify the application loads correctly
   - Test key functionality:
     - Wallet connection
     - Order creation and management
     - Chart and indicator functionality
     - Settings and preferences

3. **Run Integration Tests**:
   ```bash
   # Run integration tests against staging
   npm run test:integration
   ```

### Production Deployment

1. **Pre-deployment Checklist**:
   - [ ] All tests pass in staging environment
   - [ ] User acceptance testing completed
   - [ ] Performance testing completed
   - [ ] Security audit completed
   - [ ] Documentation updated
   - [ ] Release notes prepared

2. **Deploy to Production**:
   ```bash
   # Run the deployment script for production
   bash scripts/deploy-frontend.sh production
   ```

3. **Post-deployment Verification**:
   - [ ] Verify application loads correctly
   - [ ] Verify all features work as expected
   - [ ] Monitor error logs and performance metrics
   - [ ] Verify contract interactions

## Rollback Procedure

If issues are detected after deployment, follow these steps to rollback:

1. **Identify the Issue**:
   - Check error logs and monitoring dashboards
   - Determine if the issue is frontend-related or contract-related

2. **Frontend Rollback**:
   ```bash
   # For deployment platforms like Vercel/Netlify
   # Rollback to the previous deployment through the platform dashboard
   
   # For manual deployments
   git checkout [previous-stable-commit]
   bash scripts/deploy-frontend.sh [environment]
   ```

3. **Contract Rollback** (if applicable):
   - Follow the contract-specific rollback procedure
   - Update environment variables to point to previous contract versions

## Monitoring and Maintenance

1. **Monitoring**:
   - Check application logs regularly
   - Monitor performance metrics
   - Set up alerts for critical errors

2. **Regular Maintenance**:
   - Update dependencies regularly
   - Apply security patches promptly
   - Perform regular backups of critical data

## Troubleshooting Common Issues

### Connection Issues
- Verify RPC endpoint is accessible
- Check network configuration in the application
- Verify wallet connection settings

### Transaction Failures
- Check gas settings
- Verify contract addresses are correct
- Check for contract state changes that might affect transactions

### Performance Issues
- Check server resources
- Optimize database queries
- Consider CDN for static assets

## Contact Information

For deployment issues, contact:
- Frontend Team: [frontend-team@example.com]
- Smart Contract Team: [contract-team@example.com]
- DevOps Team: [devops@example.com] 