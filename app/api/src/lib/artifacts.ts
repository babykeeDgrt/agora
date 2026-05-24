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
    const fullPath = path.resolve(process.cwd(), relativePath);
    return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Artifact;
}

export const dutchAuctionArtifact = loadArtifact(
    "../../contracts/out/DutchAuction.sol/DutchAuction.json",
);
export const serviceRegistryArtifact = loadArtifact(
    "../../contracts/out/ServiceRegistry.sol/ServiceRegistry.json",
);
export const consumerHandlerArtifact = loadArtifact(
    "../../contracts/out/ConsumerHandler.sol/ConsumerHandler.json",
);
