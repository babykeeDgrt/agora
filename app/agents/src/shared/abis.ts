import { consumerHandlerBytecode } from "./consumer-handler-bytecode";

export const dutchAuctionAbi = [
  "event AuctionSnapped(uint256 indexed auctionId, address indexed winner, uint256 finalPrice)",
  "function getAuction(uint256 auctionId) view returns ((uint256 id, address provider, string dataType, string apiUrl, string jsonSelector, uint8 decimals, uint256 startPrice, uint256 floorPrice, uint256 currentPrice, uint256 priceStep, uint256 startBlock, uint256 timeoutBlocks, uint8 status, address winner, uint256 escrowRef))",
] as const;

export const dataProviderAbi = [
  "function platform() view returns (address)",
  "function PER_AGENT_EXECUTION_COST() view returns (uint256)",
  "function SUBCOMMITTEE_SIZE() view returns (uint256)",
  "function pendingRequests(uint256 auctionId) view returns (bool)",
  "function fulfillOrder(uint256 auctionId) payable",
] as const;

export const serviceRegistryAbi = [
  "event DataRequested(uint256 indexed requestId, uint256 indexed serviceId, address indexed consumer, uint256 payment, uint256 blockNumber)",
  "function PLATFORM() view returns (address)",
  "function PER_AGENT_EXECUTION_COST() view returns (uint256)",
  "function SUBCOMMITTEE_SIZE() view returns (uint256)",
  "function getProviderServices(address provider) view returns (uint256[])",
  "function getService(uint256 serviceId) view returns ((uint256 id, address provider, string dataType, string apiUrl, string jsonSelector, uint8 decimals, uint256 pricePerRequest, uint256 timeoutBlocks, uint8 status, uint256 totalRequests, uint256 totalDelivered, uint256 totalFailed, uint256 registeredAt))",
  "function getRequest(uint256 requestId) view returns ((uint256 id, uint256 serviceId, address consumer, uint256 payment, uint256 requestedAt, uint256 timeoutBlocks, uint8 status, uint256 deliveredPrice, uint256 agentRequestId))",
  "function fulfillRequest(uint256 requestId) payable",
] as const;

export const consumerHandlerArtifact = {
  abi: [
    "constructor(address dutchAuction_, address dataProvider_, uint256 snapThreshold_, string targetDataType_, uint64 gasLimit) payable",
  ],
  bytecode: {
    object: consumerHandlerBytecode,
  },
} as const;

export const agentPlatformAbi = [
  "function getRequestDeposit() view returns (uint256)",
] as const;
