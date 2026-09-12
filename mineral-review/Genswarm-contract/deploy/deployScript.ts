import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/genswarm.py");

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    await client.initializeConsensusSmartContract();

    console.log("Deploying GenSwarm: Stigmergic Agent Coordination Protocol...");

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [],
    });

    console.log(
      `Deploy transaction submitted: ${deployTransaction}`
    );

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      retries: 300,
    });

    if (
      receipt.status !== 5 &&
      receipt.status !== 6 &&
      receipt.statusName !== "ACCEPTED" &&
      receipt.statusName !== "FINALIZED"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    const deployedContractAddress =
      (client.chain as GenLayerChain).id === localnet.id
        ? receipt.data.contract_address
        : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

    console.log(`\n✅ GenSwarm deployed successfully!`);
    console.log(`   Contract address: ${deployedContractAddress}`);
    console.log(`   Network: ${(client.chain as GenLayerChain).id}`);
    console.log(
      `\n   Add to frontend/.env as NEXT_PUBLIC_CONTRACT_ADDRESS=${deployedContractAddress}`
    );
  } catch (error) {
    throw new Error(`Error during deployment:, ${error}`);
  }
}
