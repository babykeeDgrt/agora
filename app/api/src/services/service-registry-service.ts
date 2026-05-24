import { Interface, type ContractTransactionReceipt, type Log } from "ethers";

import type { BlockchainContext } from "../lib/blockchain";
import { serviceRegistryArtifact } from "../lib/artifacts";
import { HttpError } from "../lib/http";

const serviceStatusLabels = ["Active", "Paused", "Deactivated"] as const;
const requestStatusLabels = ["Pending", "Fulfilled", "Refunded", "Failed"] as const;

export interface ServiceView {
    id: string;
    provider: string;
    dataType: string;
    apiUrl: string;
    jsonSelector: string;
    decimals: number;
    pricePerRequest: string;
    timeoutBlocks: string;
    status: number;
    statusLabel: (typeof serviceStatusLabels)[number];
    totalRequests: string;
    totalDelivered: string;
    totalFailed: string;
    registeredAt: string;
}

export interface ServiceRequestView {
    id: string;
    serviceId: string;
    consumer: string;
    payment: string;
    requestedAt: string;
    timeoutBlocks: string;
    status: number;
    statusLabel: (typeof requestStatusLabels)[number];
    deliveredPrice: string;
    agentRequestId: string;
}

export interface RegisterServiceInput {
    dataType: string;
    apiUrl: string;
    jsonSelector: string;
    decimals: number;
    pricePerRequest: bigint;
    timeoutBlocks: bigint;
}

export class ServiceRegistryService {
    private readonly serviceRegistryInterface: Interface;

    constructor(private readonly blockchain: BlockchainContext) {
        this.serviceRegistryInterface = new Interface(serviceRegistryArtifact.abi);
    }

    async listActiveServices(): Promise<ServiceView[]> {
        const ids = (await this.blockchain.serviceRegistry.getActiveServices()) as bigint[];
        const services: ServiceView[] = [];

        for (const serviceId of ids) {
            services.push(await this.getServiceById(serviceId));
        }

        return services;
    }

    async getServiceById(serviceId: bigint): Promise<ServiceView> {
        try {
            const service = await this.blockchain.serviceRegistry.getService(serviceId);
            const status = Number(service.status);

            return {
                id: service.id.toString(),
                provider: service.provider,
                dataType: service.dataType,
                apiUrl: service.apiUrl,
                jsonSelector: service.jsonSelector,
                decimals: Number(service.decimals),
                pricePerRequest: service.pricePerRequest.toString(),
                timeoutBlocks: service.timeoutBlocks.toString(),
                status,
                statusLabel: serviceStatusLabels[status] ?? "Deactivated",
                totalRequests: service.totalRequests.toString(),
                totalDelivered: service.totalDelivered.toString(),
                totalFailed: service.totalFailed.toString(),
                registeredAt: service.registeredAt.toString(),
            };
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("ServiceNotFound")
            ) {
                throw new HttpError(
                    404,
                    `Service ${serviceId.toString()} not found`,
                );
            }
            throw error;
        }
    }

    async getServiceRequests(serviceId: bigint): Promise<ServiceRequestView[]> {
        await this.getServiceById(serviceId);
        const ids = (await this.blockchain.serviceRegistry.getServiceRequests(
            serviceId,
        )) as bigint[];
        const requests: ServiceRequestView[] = [];

        for (const requestId of ids) {
            requests.push(await this.getRequestById(requestId));
        }

        return requests;
    }

    async getRequestById(requestId: bigint): Promise<ServiceRequestView> {
        try {
            const request = await this.blockchain.serviceRegistry.getRequest(
                requestId,
            );
            const status = Number(request.status);

            return {
                id: request.id.toString(),
                serviceId: request.serviceId.toString(),
                consumer: request.consumer,
                payment: request.payment.toString(),
                requestedAt: request.requestedAt.toString(),
                timeoutBlocks: request.timeoutBlocks.toString(),
                status,
                statusLabel: requestStatusLabels[status] ?? "Failed",
                deliveredPrice: request.deliveredPrice.toString(),
                agentRequestId: request.agentRequestId.toString(),
            };
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("RequestNotFound")
            ) {
                throw new HttpError(
                    404,
                    `Request ${requestId.toString()} not found`,
                );
            }
            throw error;
        }
    }

    async registerService(input: RegisterServiceInput): Promise<{
        serviceId: string;
        transactionHash: string;
        blockNumber: number;
    }> {
        const tx = await this.blockchain.serviceRegistry.registerService(
            input.dataType,
            input.apiUrl,
            input.jsonSelector,
            input.decimals,
            input.pricePerRequest,
            input.timeoutBlocks,
        );

        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Missing transaction receipt for registerService");
        }

        const serviceId = this.extractServiceRegisteredId(receipt);

        return {
            serviceId: serviceId.toString(),
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    }

    async requestData(serviceId: bigint, consumerAddress?: string): Promise<{
        requestId: string;
        serviceId: string;
        consumer: string;
        payment: string;
        transactionHash: string;
        blockNumber: number;
    }> {
        const walletAddress = await this.blockchain.wallet.getAddress();
        if (consumerAddress && consumerAddress !== walletAddress) {
            throw new HttpError(
                400,
                `consumerAddress must match API wallet ${walletAddress}`,
            );
        }

        const service = await this.getServiceById(serviceId);
        if (service.statusLabel !== "Active") {
            throw new HttpError(409, `Service ${service.id} is not active`);
        }

        const payment = BigInt(service.pricePerRequest);
        const tx = await this.blockchain.serviceRegistry.requestData(serviceId, {
            value: payment,
        });
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Missing transaction receipt for requestData");
        }

        const requestId = this.extractDataRequestedId(receipt);

        return {
            requestId: requestId.toString(),
            serviceId: service.id,
            consumer: walletAddress,
            payment: payment.toString(),
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    }

    async pauseService(serviceId: bigint): Promise<{
        serviceId: string;
        status: "Paused";
        transactionHash: string;
        blockNumber: number;
    }> {
        const tx = await this.blockchain.serviceRegistry.pauseService(serviceId);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Missing transaction receipt for pauseService");
        }

        return {
            serviceId: serviceId.toString(),
            status: "Paused",
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    }

    async claimRefund(requestId: bigint): Promise<{
        requestId: string;
        status: "Refunded";
        transactionHash: string;
        blockNumber: number;
    }> {
        const request = await this.getRequestById(requestId);
        const walletAddress = await this.blockchain.wallet.getAddress();
        if (request.consumer !== walletAddress) {
            throw new HttpError(
                400,
                `request consumer must match API wallet ${walletAddress}`,
            );
        }

        const tx = await this.blockchain.serviceRegistry.claimRefund(requestId);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Missing transaction receipt for claimRefund");
        }

        return {
            requestId: requestId.toString(),
            status: "Refunded",
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    }

    async resumeService(serviceId: bigint): Promise<{
        serviceId: string;
        status: "Active";
        transactionHash: string;
        blockNumber: number;
    }> {
        const tx = await this.blockchain.serviceRegistry.resumeService(serviceId);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Missing transaction receipt for resumeService");
        }

        return {
            serviceId: serviceId.toString(),
            status: "Active",
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    }

    private extractServiceRegisteredId(
        receipt: ContractTransactionReceipt,
    ): bigint {
        for (const log of receipt.logs as Log[]) {
            try {
                const parsed = this.serviceRegistryInterface.parseLog(log);
                if (parsed?.name === "ServiceRegistered") {
                    return BigInt(parsed.args.serviceId);
                }
            } catch {
                continue;
            }
        }

        throw new Error(
            "ServiceRegistered event not found in transaction receipt",
        );
    }

    private extractDataRequestedId(
        receipt: ContractTransactionReceipt,
    ): bigint {
        for (const log of receipt.logs as Log[]) {
            try {
                const parsed = this.serviceRegistryInterface.parseLog(log);
                if (parsed?.name === "DataRequested") {
                    return BigInt(parsed.args.requestId);
                }
            } catch {
                continue;
            }
        }

        throw new Error("DataRequested event not found in transaction receipt");
    }
}
