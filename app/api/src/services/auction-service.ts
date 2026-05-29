import { Interface, type ContractTransactionReceipt, type Log } from "ethers";

import { dutchAuctionAbi } from "../config/dutchAuctionAbi";
import type { BlockchainContext } from "../lib/blockchain";
import { HttpError } from "../lib/http";

const auctionStatusLabels = ["Active", "Snapped", "Expired"] as const;

export interface AuctionView {
    id: string;
    provider: string;
    dataType: string;
    apiUrl: string;
    jsonSelector: string;
    decimals: number;
    startPrice: string;
    floorPrice: string;
    currentPrice: string;
    priceStep: string;
    startBlock: string;
    timeoutBlocks: string;
    status: number;
    statusLabel: (typeof auctionStatusLabels)[number];
    winner: string;
    escrowRef: string;
}

export interface CreateAuctionInput {
    dataType: string;
    apiUrl: string;
    jsonSelector: string;
    decimals: number;
    startPrice: bigint;
    floorPrice: bigint;
    priceStep: bigint;
    timeoutBlocks: bigint;
}

export class AuctionService {
    private readonly auctionInterface: Interface;

    constructor(private readonly blockchain: BlockchainContext) {
        this.auctionInterface = new Interface(dutchAuctionAbi);
    }

    async getAuctionCount(): Promise<bigint> {
        return BigInt(await this.blockchain.dutchAuction.auctionCount());
    }

    async listAuctions(): Promise<AuctionView[]> {
        const count = await this.getAuctionCount();
        const auctions: AuctionView[] = [];

        for (let auctionId = 1n; auctionId <= count; auctionId += 1n) {
            const auction = await this.getAuctionById(auctionId);
            auctions.push(auction);
        }

        return auctions;
    }

    async getAuctionById(auctionId: bigint): Promise<AuctionView> {
        try {
            const auction =
                await this.blockchain.dutchAuction.getAuction(auctionId);
            const status = Number(auction.status);

            return {
                id: auction.id.toString(),
                provider: auction.provider,
                dataType: auction.dataType,
                apiUrl: auction.apiUrl,
                jsonSelector: auction.jsonSelector,
                decimals: Number(auction.decimals),
                startPrice: auction.startPrice.toString(),
                floorPrice: auction.floorPrice.toString(),
                currentPrice: auction.currentPrice.toString(),
                priceStep: auction.priceStep.toString(),
                startBlock: auction.startBlock.toString(),
                timeoutBlocks: auction.timeoutBlocks.toString(),
                status,
                statusLabel: auctionStatusLabels[status] ?? "Expired",
                winner: auction.winner,
                escrowRef: auction.escrowRef.toString(),
            };
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("AuctionNotFound")
            ) {
                throw new HttpError(
                    404,
                    `Auction ${auctionId.toString()} not found`,
                );
            }
            throw error;
        }
    }

    async createAuction(input: CreateAuctionInput): Promise<{
        auctionId: string;
        transactionHash: string;
        blockNumber: number;
    }> {
        const tx = await this.blockchain.dutchAuction.startAuction(
            input.dataType,
            input.apiUrl,
            input.jsonSelector,
            input.decimals,
            input.startPrice,
            input.floorPrice,
            input.priceStep,
            input.timeoutBlocks,
        );

        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Missing transaction receipt for startAuction");
        }

        const auctionId = this.extractAuctionStartedId(receipt);

        return {
            auctionId: auctionId.toString(),
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    }

    private extractAuctionStartedId(
        receipt: ContractTransactionReceipt,
    ): bigint {
        for (const log of receipt.logs as Log[]) {
            try {
                const parsed = this.auctionInterface.parseLog(log);
                if (parsed?.name === "AuctionStarted") {
                    return BigInt(parsed.args.auctionId);
                }
            } catch {
                continue;
            }
        }

        throw new Error(
            "AuctionStarted event not found in transaction receipt",
        );
    }
}
