import {
    Contract,
    JsonRpcProvider,
    type ContractTransactionResponse,
    Wallet,
} from "ethers";

import { dutchAuctionAbi } from "../config/dutchAuctionAbi";
import { loadEnv, type AppEnv } from "../config/env";
import { serviceRegistryAbi } from "../config/serviceRegistryAbi";

export interface BlockchainContext {
    env: AppEnv;
    provider: JsonRpcProvider;
    wallet: Wallet;
    dutchAuction: Contract & {
        auctionCount(): Promise<bigint>;
        getAuction(auctionId: bigint): Promise<{
            id: bigint;
            provider: string;
            dataType: string;
            apiUrl: string;
            jsonSelector: string;
            decimals: bigint;
            startPrice: bigint;
            floorPrice: bigint;
            currentPrice: bigint;
            priceStep: bigint;
            startBlock: bigint;
            timeoutBlocks: bigint;
            status: bigint;
            winner: string;
            escrowRef: bigint;
        }>;
        startAuction(
            dataType: string,
            apiUrl: string,
            jsonSelector: string,
            decimals: number,
            startPrice: bigint,
            floorPrice: bigint,
            priceStep: bigint,
            timeoutBlocks: bigint,
        ): Promise<ContractTransactionResponse>;
    };
    serviceRegistry: Contract & {
        getActiveServices(): Promise<bigint[]>;
        getProviderServices(provider: string): Promise<bigint[]>;
        getServiceRequests(serviceId: bigint): Promise<bigint[]>;
        getService(serviceId: bigint): Promise<{
            id: bigint;
            provider: string;
            dataType: string;
            apiUrl: string;
            jsonSelector: string;
            decimals: bigint;
            pricePerRequest: bigint;
            timeoutBlocks: bigint;
            status: bigint;
            totalRequests: bigint;
            totalDelivered: bigint;
            totalFailed: bigint;
            registeredAt: bigint;
        }>;
        getRequest(requestId: bigint): Promise<{
            id: bigint;
            serviceId: bigint;
            consumer: string;
            payment: bigint;
            requestedAt: bigint;
            timeoutBlocks: bigint;
            status: bigint;
            deliveredPrice: bigint;
            agentRequestId: bigint;
        }>;
        registerService(
            dataType: string,
            apiUrl: string,
            jsonSelector: string,
            decimals: number,
            pricePerRequest: bigint,
            timeoutBlocks: bigint,
        ): Promise<ContractTransactionResponse>;
        requestData(
            serviceId: bigint,
            overrides: { value: bigint },
        ): Promise<ContractTransactionResponse>;
        claimRefund(requestId: bigint): Promise<ContractTransactionResponse>;
        pauseService(serviceId: bigint): Promise<ContractTransactionResponse>;
        resumeService(serviceId: bigint): Promise<ContractTransactionResponse>;
    };
}

export function createBlockchainContext(): BlockchainContext {
    const env = loadEnv();
    const provider = new JsonRpcProvider(env.rpcUrl);
    const wallet = new Wallet(env.privateKey, provider);

    const dutchAuction = new Contract(
        env.dutchAuctionAddress,
        dutchAuctionAbi,
        wallet,
    ) as BlockchainContext["dutchAuction"];
    const serviceRegistry = new Contract(
        env.serviceRegistryAddress,
        serviceRegistryAbi,
        wallet,
    ) as BlockchainContext["serviceRegistry"];

    return {
        env,
        provider,
        wallet,
        dutchAuction,
        serviceRegistry,
    };
}
