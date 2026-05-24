import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import type { AppEnv } from "../config/env";

const execFileAsync = promisify(execFile);

function contractsDir(): string {
    return path.resolve(process.cwd(), "..", "..", "contracts");
}

function extractValue(output: string, label: string, pattern: RegExp): string {
    const match = output.match(pattern);
    const value = match?.[1];

    if (!value) {
        throw new Error(`Could not parse ${label} from forge output:\n${output}`);
    }

    return value;
}

export async function deployConsumerHandlerViaForge(
    env: AppEnv,
    snapThresholdWei: bigint,
    targetDataType: string,
    deployValue: bigint,
): Promise<{ address: string; transactionHash: string }> {
    const args = [
        "create",
        "--rpc-url",
        env.rpcUrl,
        "--private-key",
        env.privateKey,
        "--broadcast",
        "--value",
        deployValue.toString(),
        "src/ConsumerHandler.sol:ConsumerHandler",
        "--constructor-args",
        env.dutchAuctionAddress,
        env.dataProviderAddress,
        snapThresholdWei.toString(),
        targetDataType,
        env.consumerHandlerGasLimit.toString(),
    ];

    const { stdout, stderr } = await execFileAsync(env.forgeBin, args, {
        cwd: contractsDir(),
        env: process.env,
    });

    const output = `${stdout}\n${stderr}`;

    return {
        address: extractValue(
            output,
            "deployment address",
            /Deployed to:\s*(0x[a-fA-F0-9]{40})/,
        ),
        transactionHash: extractValue(
            output,
            "transaction hash",
            /Transaction hash:\s*(0x[a-fA-F0-9]{64})/,
        ),
    };
}
