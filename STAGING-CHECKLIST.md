# Staging Deployment Checklist

Use this checklist to ensure your application is ready for staging deployment.

## Pre-Deployment Checks

- [ ] All unit tests are passing (`npm test`)
- [ ] Environment variables are properly configured in `.env.staging`
- [ ] Contract addresses are updated with actual deployed addresses
- [ ] WalletConnect Project ID is set
- [ ] API endpoints are correctly configured

## Configuration Verification

- [ ] Verify Base Sepolia testnet is properly configured (Chain ID: 84532)
- [ ] Verify RPC URL is correct (`https://sepolia.base.org`)
- [ ] Verify feature flags are set appropriately for staging

## Deployment Process

1. Run the staging deployment script:
   ```
   npm run deploy:staging
   ```

2. Verify the deployment:
   - [ ] Application loads correctly at staging URL
   - [ ] Wallet connection works
   - [ ] Contract interactions work
   - [ ] IndicatorSettings component functions correctly

3. Run integration tests:
   ```
   npm run test:integration
   ```

## Post-Deployment Verification

- [ ] Check application logs for errors
- [ ] Verify monitoring is working correctly
- [ ] Test key user flows:
  - [ ] Connecting wallet
  - [ ] Creating orders
  - [ ] Managing orders
  - [ ] Using charts and indicators

## Rollback Plan

If issues are detected:

1. Identify the issue using monitoring tools
2. Determine if a rollback is necessary
3. If rollback is needed:
   - Redeploy the previous stable version
   - Update environment variables if necessary

## Notes

- Staging environment is intended for testing and validation
- Report any issues to the development team
- Document any manual changes made during deployment 