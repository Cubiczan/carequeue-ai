import { ethers } from "hardhat";

/**
 * @title Deploy Script
 * @notice Deploys the CritMinOracle contract to HashKey Chain testnet.
 * @dev Usage: npx hardhat run scripts/deploy.ts --network hashkey-testnet
 *
 * Requirements:
 *   - PRIVATE_KEY in .env (account with tHSK from faucet)
 *   - RPC_URL in .env (defaults to HashKey Chain testnet RPC)
 */

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  CritMin Oracle — Deployment to HashKey Chain Testnet    ");
  console.log("═══════════════════════════════════════════════════════════");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer address: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} tHSK`);

  if (balance === 0n) {
    console.log("\n⚠️  WARNING: Account has no tHSK balance!");
    console.log("   Get testnet tHSK from: https://faucet.hsk.xyz");
    console.log("   Then re-run this script.\n");
    process.exit(1);
  }

  // Deploy the oracle contract
  console.log("\nDeploying CritMinOracle contract...");

  const CritMinOracle = await ethers.getContractFactory("CritMinOracle");
  const oracle = await CritMinOracle.deploy(
    "CritMin Oracle",  // name
    "1.0.0"            // version
  );

  await oracle.waitForDeployment();

  const oracleAddress = await oracle.getAddress();
  console.log(`✅ CritMinOracle deployed to: ${oracleAddress}`);

  // Get deployment info
  const network = await ethers.provider.getNetwork();
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   TX Hash: ${oracle.deploymentTransaction()?.hash}`);

  // Initialize the oracle (registers LITHIUM, NICKEL, COBALT)
  console.log("\nInitializing oracle with default minerals...");
  const initTx = await oracle.initialize();
  await initTx.wait();
  console.log("✅ Oracle initialized with LITHIUM, NICKEL, COBALT");

  // Verify initialization
  const mineralCount = await oracle.getMineralCount();
  console.log(`   Registered minerals: ${mineralCount}`);

  const mineralList = await oracle.getMineralList();
  for (let i = 0; i < mineralList.length; i++) {
    const data = await oracle.getMineralData(mineralList[i]);
    console.log(`   - ${data.symbol}`);
  }

  // Output summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT SUMMARY                                        ");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Contract Address: ${oracleAddress}`);
  console.log(`  Network:          HashKey Chain Testnet (Chain ID: 133)`);
  console.log(`  Explorer:         https://testnet-explorer.hsk.xyz/address/${oracleAddress}`);
  console.log(`  Owner:            ${deployer.address}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Save deployment info for pipeline use
  const deploymentInfo = {
    address: oracleAddress,
    network: "hashkey-testnet",
    chainId: 133,
    owner: deployer.address,
    deployedAt: new Date().toISOString(),
    explorer: `https://testnet-explorer.hsk.xyz/address/${oracleAddress}`,
  };

  // We can't write files easily from a hardhat script, so just log it
  console.log("📋 Deployment Info (save this for the pipeline):");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
