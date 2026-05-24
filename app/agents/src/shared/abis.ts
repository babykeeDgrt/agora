import fs from "node:fs";
import path from "node:path";

import type { InterfaceAbi } from "ethers";

interface Artifact {
  abi: InterfaceAbi;
  bytecode?: {
    object: string;
  };
}

function loadArtifact(relativePath: string): Artifact {
  const cwdPath = path.resolve(process.cwd(), relativePath);
  const raw = fs.readFileSync(cwdPath, "utf8");
  return JSON.parse(raw) as Artifact;
}

const dutchAuctionArtifact = loadArtifact("../../contracts/out/DutchAuction.sol/DutchAuction.json");
const dataProviderArtifact = loadArtifact("../../contracts/out/DataProvider.sol/DataProvider.json");
const serviceRegistryArtifact = loadArtifact("../../contracts/out/ServiceRegistry.sol/ServiceRegistry.json");
export const consumerHandlerArtifact = loadArtifact("../../contracts/out/ConsumerHandler.sol/ConsumerHandler.json");

export const dutchAuctionAbi = dutchAuctionArtifact.abi;
export const dataProviderAbi = dataProviderArtifact.abi;
export const serviceRegistryAbi = serviceRegistryArtifact.abi;

export const agentPlatformAbi = [
  "function getRequestDeposit() view returns (uint256)",
] as const;
