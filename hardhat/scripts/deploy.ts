import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment...");

  const aavePoolAddressProviderPolygon = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
  const quickswapV3Router = "0xf5b509bb0909a69b1c207e495f687a596c168e12"; // Quickswap V3 Router
  const sushiswapV2Router = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // Sushiswap V2 Router

  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", await deployer.getAddress());

    // Get current gas price and add a buffer
    const gasPrice = await ethers.provider.getFeeData();
    console.log("Current gas price:", gasPrice);

    const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
    console.log("Deploying ArbitrageExecutor...");
    
    // Deploy with specific gas settings
    const arbitrageExecutor = await ArbitrageExecutor.deploy(
      aavePoolAddressProviderPolygon,
      quickswapV3Router,
      sushiswapV2Router,
      {
        maxFeePerGas: gasPrice.maxFeePerGas! * 2n,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas! * 2n,
        gasLimit: 10000000
      }
    );

    await arbitrageExecutor.waitForDeployment();
    
    const address = await arbitrageExecutor.getAddress();
    console.log("ArbitrageExecutor deployed to:", address);

    // Log additional information for verification
    const deployTx = arbitrageExecutor.deploymentTransaction();
    if (deployTx) {
      console.log("Deployment transaction hash:", deployTx.hash);
      const receipt = await deployTx.wait();
      console.log("Deployment block number:", receipt?.blockNumber);

      // Write the contract address to the server's .env file
      const fs = require('fs');
      const envPath = '../server/.env';
      const envContent = fs.readFileSync(envPath, 'utf8');
      const updatedEnvContent = envContent.replace(
        /ARBITRAGE_EXECUTOR_ADDRESS=.*/,
        `ARBITRAGE_EXECUTOR_ADDRESS=${address}`
      );
      fs.writeFileSync(envPath, updatedEnvContent);
      console.log("Updated server/.env with new contract address");
    }
    
    return address;
  } catch (error: any) { // Explicitly type error as any to access receipt
    console.error("Error during deployment:", error.message);
    if (error.receipt) {
      const receipt = error.receipt;
      if (receipt.revertReason) {
        console.error("Revert Reason:", receipt.revertReason);
      } else {
        console.error("No revert reason in receipt, transaction likely failed before reaching contract execution");
      }
    } else {
      console.error("No receipt available, deployment likely failed before transaction submission");
    }
    throw error;
  }
}

main()
  .then((address) => {
    console.log("Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });