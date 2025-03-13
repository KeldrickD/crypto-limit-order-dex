import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.deploy
dotenv.config({ path: ".env.deploy" });

async function main() {
  // Get signer from hardhat
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Uniswap V3 SwapRouter address on Base Sepolia
  // This is the Uniswap V3 SwapRouter address on Base Sepolia Testnet
  const UNISWAP_SWAP_ROUTER = "0x8357227D4eDc78991Db6FDB9bD6ADE250536dE1d";

  console.log("Deploying LimitOrderDEX contract...");
  // Deploy LimitOrderDEX contract
  const LimitOrderDEX = await ethers.getContractFactory("LimitOrderDEX");
  const limitOrderDEX = await LimitOrderDEX.deploy(UNISWAP_SWAP_ROUTER);
  await limitOrderDEX.deployTransaction.wait();

  console.log("LimitOrderDEX deployed to:", limitOrderDEX.address);

  // Deploy LimitOrderKeeper contract
  console.log("Deploying LimitOrderKeeper contract...");
  const checkGasLimit = 500000; // Gas limit for checkUpkeep
  const maxOrdersToCheck = 10; // Maximum orders to check per upkeep

  const LimitOrderKeeper = await ethers.getContractFactory("LimitOrderKeeper");
  const limitOrderKeeper = await LimitOrderKeeper.deploy(
    limitOrderDEX.address,
    checkGasLimit,
    maxOrdersToCheck
  );
  await limitOrderKeeper.deployTransaction.wait();

  console.log("LimitOrderKeeper deployed to:", limitOrderKeeper.address);

  // Set up some example price feeds for Base Sepolia
  console.log("Setting up price feeds on Base Sepolia...");
  
  // WETH price feed on Base Sepolia
  const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
  const WETH_PRICE_FEED = "0x4Cf57DC9028187b9DAef0E0Cf8Ff6162CcE1fF8C"; // Base Sepolia ETH/USD feed
  
  // USDC price feed on Base Sepolia
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const USDC_PRICE_FEED = "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B"; // Base Sepolia USDC/USD feed
  
  // Set price feeds for tokens
  try {
    console.log("Setting price feed for WETH...");
    await limitOrderDEX.setPriceFeed(WETH_ADDRESS, WETH_PRICE_FEED);
    
    console.log("Setting price feed for USDC...");
    await limitOrderDEX.setPriceFeed(USDC_ADDRESS, USDC_PRICE_FEED);
    
    console.log("Price feeds set successfully");
  } catch (error) {
    console.error("Error setting price feeds:", error);
  }

  // Update environment files with the new contract addresses
  updateEnvFile(".env.staging", {
    NEXT_PUBLIC_LIMIT_ORDER_DEX_ADDRESS: limitOrderDEX.address,
    NEXT_PUBLIC_LIMIT_ORDER_KEEPER_ADDRESS: limitOrderKeeper.address
  });

  console.log("Deployment completed successfully");
  console.log("Contract addresses have been updated in .env.staging");
}

// Helper function to update environment files
function updateEnvFile(filePath: string, updates: Record<string, string>) {
  try {
    const envPath = path.resolve(process.cwd(), filePath);
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update each key-value pair
    for (const [key, value] of Object.entries(updates)) {
      // Check if the key exists in the file
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(envContent)) {
        // Replace existing value
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new key-value pair
        envContent += `\n${key}=${value}`;
      }
    }
    
    // Write updated content back to file
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated ${filePath} with new contract addresses`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 