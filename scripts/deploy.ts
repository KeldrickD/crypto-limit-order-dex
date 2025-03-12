import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Uniswap V3 SwapRouter address on Base
  // This is the actual Uniswap V3 SwapRouter address on Base Mainnet
  const UNISWAP_SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

  // Deploy LimitOrderDEX contract
  const LimitOrderDEX = await ethers.getContractFactory("LimitOrderDEX");
  const limitOrderDEX = await LimitOrderDEX.deploy(UNISWAP_SWAP_ROUTER);
  await limitOrderDEX.deployTransaction.wait();

  console.log("LimitOrderDEX deployed to:", limitOrderDEX.address);

  // Deploy LimitOrderKeeper contract
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

  // Set up some example price feeds (this would be different for mainnet)
  // These are just example values, you'll need to replace with actual Chainlink price feed addresses
  console.log("Setting up price feeds (this is for demo purposes)...");
  
  // WETH price feed on Base 
  const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
  const WETH_PRICE_FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
  
  // USDC price feed on Base
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDC_PRICE_FEED = "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B";
  
  // Set price feeds for tokens
  try {
    await limitOrderDEX.setPriceFeed(WETH_ADDRESS, WETH_PRICE_FEED);
    await limitOrderDEX.setPriceFeed(USDC_ADDRESS, USDC_PRICE_FEED);
    console.log("Price feeds set successfully");
  } catch (error) {
    console.error("Error setting price feeds:", error);
  }

  console.log("Deployment completed successfully");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 