import { ContractFactory } from "ethers";

import { consumerHandlerAbi } from "../config/consumerHandlerAbi";
import { consumerHandlerBytecode } from "../config/consumerHandlerBytecode";
import type { BlockchainContext } from "../lib/blockchain";
import { HttpError } from "../lib/http";
import { AuctionService, type AuctionView } from "./auction-service";
import {
  ConsumerPlannerService,
} from "./consumer-planner";

export type ConsumerUrgency = "low" | "medium" | "high";

export interface SpawnConsumerInput {
  auctionId: bigint;
  budgetWei: bigint;
  urgency: ConsumerUrgency;
  targetDataType?: string;
}

export class ConsumerService {
  constructor(
    private readonly blockchain: BlockchainContext,
    private readonly auctionService: AuctionService,
  ) {}

  private getPlanner(): ConsumerPlannerService {
    return new ConsumerPlannerService(this.blockchain.env);
  }

  async planConsumer(input: SpawnConsumerInput): Promise<{
    auction: AuctionView;
    snapThresholdWei: string;
    budgetWei: string;
    rationale: string;
    model: string;
  }> {
    const auction = await this.auctionService.getAuctionById(input.auctionId);
    if (auction.statusLabel !== "Active") {
      throw new HttpError(409, `Auction ${auction.id} is not active`);
    }

    const plan = await this.getPlanner().plan(
      auction,
      input.budgetWei,
      input.urgency,
    );

    return {
      auction,
      snapThresholdWei: plan.snapThresholdWei.toString(),
      budgetWei: input.budgetWei.toString(),
      rationale: plan.rationale,
      model: plan.model,
    };
  }

  async spawnConsumer(input: SpawnConsumerInput): Promise<{
    consumerHandlerAddress: string;
    auction: AuctionView;
    snapThresholdWei: string;
    budgetWei: string;
    rationale: string;
    model: string;
    transactionHash: string;
    blockNumber: number;
  }> {
    const plan = await this.planConsumer(input);
    const auction = plan.auction;
    const snapThresholdWei = BigInt(plan.snapThresholdWei);
    const deployValue =
      input.budgetWei + this.blockchain.env.consumerSubscriptionReserveWei;
    const targetDataType = input.targetDataType ?? auction.dataType;

    const factory = new ContractFactory(
      consumerHandlerAbi,
      consumerHandlerBytecode,
      this.blockchain.wallet,
    );
    const consumerHandler = await factory.deploy(
      this.blockchain.env.dutchAuctionAddress,
      this.blockchain.env.dataProviderAddress,
      snapThresholdWei,
      targetDataType,
      this.blockchain.env.consumerHandlerGasLimit,
      { value: deployValue },
    );

    const deploymentTx = consumerHandler.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error("Missing ConsumerHandler deployment transaction");
    }

    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error("Missing transaction receipt for ConsumerHandler deployment");
    }

    return {
      consumerHandlerAddress: await consumerHandler.getAddress(),
      auction,
      snapThresholdWei: plan.snapThresholdWei,
      budgetWei: input.budgetWei.toString(),
      rationale: plan.rationale,
      model: plan.model,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }
}
