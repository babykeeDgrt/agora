import "dotenv/config";

export interface AppEnv {
    port: number;
    rpcUrl: string;
    privateKey: string;
    huggingFaceApiKey?: string;
    huggingFaceModel?: string;
    dutchAuctionAddress: string;
    dataProviderAddress: string;
    serviceRegistryAddress: string;
    auctionClockGasLimit: bigint;
    consumerHandlerGasLimit: bigint;
    consumerSubscriptionReserveWei: bigint;
    webUrl: string;
}

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function loadEnv(): AppEnv {
    return {
        port: Number(process.env.PORT ?? "3300"),
        rpcUrl: requireEnv("RPC_URL"),
        privateKey: requireEnv("PRIVATE_KEY"),
        ...(process.env.HUGGINGFACE_API_KEY
            ? { huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY }
            : {}),
        ...(process.env.HUGGINGFACE_MODEL
            ? { huggingFaceModel: process.env.HUGGINGFACE_MODEL }
            : {}),
        dutchAuctionAddress: requireEnv("DUTCH_AUCTION_ADDRESS"),
        dataProviderAddress: requireEnv("DATA_PROVIDER_ADDRESS"),
        serviceRegistryAddress: requireEnv("SERVICE_REGISTRY_ADDRESS"),
        auctionClockGasLimit: BigInt(
            process.env.AUCTION_CLOCK_GAS_LIMIT ?? "5000000",
        ),
        consumerHandlerGasLimit: BigInt(
            process.env.CONSUMER_HANDLER_GAS_LIMIT ?? "2000000",
        ),
        consumerSubscriptionReserveWei: BigInt(
            process.env.CONSUMER_SUBSCRIPTION_RESERVE_WEI ??
                "32000000000000000000",
        ),
        webUrl: requireEnv("WEB_URL"),
    };
}
