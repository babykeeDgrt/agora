import { ethers } from "ethers";
import { SomniaAgentKit } from "somnia-agent-kit";

import { agentPlatformAbi, dataProviderAbi, dutchAuctionAbi, serviceRegistryAbi } from "./abis";
import type { AppConfig } from "./config";

type DataProviderContract = ethers.Contract & {
  platform: () => Promise<string>;
  PER_AGENT_EXECUTION_COST: () => Promise<bigint>;
  SUBCOMMITTEE_SIZE: () => Promise<bigint>;
  pendingRequests: (auctionId: bigint) => Promise<boolean>;
  fulfillOrder: (auctionId: bigint, overrides: { value: bigint }) => Promise<ethers.ContractTransactionResponse>;
};

export interface AuctionRecord {
  id: bigint;
  provider: string;
  dataType: string;
  apiUrl: string;
  jsonSelector: string;
  decimals: number;
  startPrice: bigint;
  floorPrice: bigint;
  currentPrice: bigint;
  priceStep: bigint;
  startBlock: bigint;
  timeoutBlocks: bigint;
  status: bigint;
  winner: string;
  escrowRef: bigint;
}

type DutchAuctionContract = ethers.Contract & {
  getAuction: (auctionId: bigint) => Promise<AuctionRecord>;
};

type AgentPlatformContract = ethers.Contract & {
  getRequestDeposit: () => Promise<bigint>;
};

export interface ServiceRecord {
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
}

type ServiceRegistryContract = ethers.Contract & {
  PLATFORM: () => Promise<string>;
  PER_AGENT_EXECUTION_COST: () => Promise<bigint>;
  SUBCOMMITTEE_SIZE: () => Promise<bigint>;
  getProviderServices: (provider: string) => Promise<bigint[]>;
  getService: (serviceId: bigint) => Promise<ServiceRecord>;
  getRequest: (requestId: bigint) => Promise<{
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
  fulfillRequest: (
    requestId: bigint,
    overrides: { value: bigint }
  ) => Promise<ethers.ContractTransactionResponse>;
};

export interface RuntimeContracts {
  kit?: SomniaAgentKit;
  provider: ethers.Wallet | ethers.Signer;
  dutchAuction: DutchAuctionContract;
  dataProvider: DataProviderContract;
  serviceRegistry: ServiceRegistryContract;
  auctionPlatform: AgentPlatformContract;
  servicePlatform: AgentPlatformContract;
}

export async function createRuntimeContracts(config: AppConfig): Promise<RuntimeContracts> {
  const provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
  const signer = new ethers.Wallet(config.privateKey, provider);

  const dutchAuction = new ethers.Contract(
    config.dutchAuctionAddress,
    dutchAuctionAbi,
    signer,
  ) as DutchAuctionContract;
  const dataProvider = new ethers.Contract(
    config.dataProviderAddress,
    dataProviderAbi,
    signer,
  ) as DataProviderContract;
  const serviceRegistry = new ethers.Contract(
    config.serviceRegistryAddress,
    serviceRegistryAbi,
    signer,
  ) as ServiceRegistryContract;

  const auctionPlatformAddress = await dataProvider.platform();
  const servicePlatformAddress = await serviceRegistry.PLATFORM();
  const auctionPlatform = new ethers.Contract(
    auctionPlatformAddress,
    agentPlatformAbi,
    signer,
  ) as AgentPlatformContract;
  const servicePlatform = new ethers.Contract(
    servicePlatformAddress,
    agentPlatformAbi,
    signer,
  ) as AgentPlatformContract;

  if (!config.agentKitIdentityEnabled || !config.agentKitConfig) {
    return {
      provider: signer,
      dutchAuction,
      dataProvider,
      serviceRegistry,
      auctionPlatform,
      servicePlatform,
    };
  }

  const kit = new SomniaAgentKit(config.agentKitConfig);
  await kit.initialize();

  return {
    kit,
    provider: signer,
    dutchAuction,
    dataProvider,
    serviceRegistry,
    auctionPlatform,
    servicePlatform,
  };
}
