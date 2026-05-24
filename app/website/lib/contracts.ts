export const addresses = {
  dutchAuction:
    process.env.NEXT_PUBLIC_DUTCH_AUCTION_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  dataProvider:
    process.env.NEXT_PUBLIC_DATA_PROVIDER_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  serviceRegistry:
    process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  escrow:
    process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  explorer:
    process.env.NEXT_PUBLIC_EXPLORER_URL ??
    "https://shannon-explorer.somnia.network",
} as const;

export const dutchAuctionAbi = [
  {
    type: "event",
    name: "AuctionStarted",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "dataType", type: "string" },
      { indexed: false, name: "startPrice", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PriceTick",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: false, name: "newPrice", type: "uint256" },
      { indexed: false, name: "blockNumber", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "AuctionSnapped",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: true, name: "winner", type: "address" },
      { indexed: false, name: "finalPrice", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "AuctionExpired",
    inputs: [{ indexed: true, name: "auctionId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "startAuction",
    inputs: [
      { name: "dataType", type: "string" },
      { name: "apiUrl", type: "string" },
      { name: "jsonSelector", type: "string" },
      { name: "decimals", type: "uint8" },
      { name: "startPrice", type: "uint256" },
      { name: "floorPrice", type: "uint256" },
      { name: "priceStep", type: "uint256" },
      { name: "timeoutBlocks", type: "uint256" },
    ],
    outputs: [{ name: "auctionId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "snap",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const dataProviderAbi = [
  {
    type: "event",
    name: "DataDelivered",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: true, name: "consumer", type: "address" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export const serviceRegistryAbi = [
  {
    type: "event",
    name: "ServiceRegistered",
    inputs: [
      { indexed: true, name: "serviceId", type: "uint256" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "dataType", type: "string" },
      { indexed: false, name: "pricePerRequest", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ServiceStatusChanged",
    inputs: [
      { indexed: true, name: "serviceId", type: "uint256" },
      { indexed: false, name: "newStatus", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "DataRequested",
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "serviceId", type: "uint256" },
      { indexed: true, name: "consumer", type: "address" },
      { indexed: false, name: "payment", type: "uint256" },
      { indexed: false, name: "blockNumber", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "DataDelivered",
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "serviceId", type: "uint256" },
      { indexed: true, name: "consumer", type: "address" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RequestRefunded",
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: false, name: "consumer", type: "address" },
      { indexed: false, name: "payment", type: "uint256" },
    ],
  },
] as const;

export const escrowAbi = [
  {
    type: "event",
    name: "PaymentRefunded",
    inputs: [
      { indexed: true, name: "auctionId", type: "uint256" },
      { indexed: false, name: "buyer", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;
