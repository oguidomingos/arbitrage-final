import { ethers } from "hardhat";

async function main() {
  console.log("Iniciando deploy do ArbitrageExecutor...");

  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  const arbitrageExecutor = await ArbitrageExecutor.deploy();

  await arbitrageExecutor.waitForDeployment();

  const address = await arbitrageExecutor.getAddress();
  console.log(`ArbitrageExecutor deployado em: ${address}`);

  // Verificar se o contrato está conectado corretamente com o Aave
  const pool = await arbitrageExecutor.POOL();
  console.log(`Aave Pool address: ${pool}`);

  console.log("\nVerificando configuração do ambiente...");
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${await ethers.provider.getBalance(deployer.address)}`);

  console.log("\nContrato deployado e configurado com sucesso!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});