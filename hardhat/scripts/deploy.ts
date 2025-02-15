import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment...");

  const aavePoolAddressProviderPolygon = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";

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