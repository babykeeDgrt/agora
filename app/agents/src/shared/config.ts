import "dotenv/config";

import { SOMNIA_NETWORKS, type AgentKitConfig, type NetworkConfig } from "somnia-agent-kit";

const TESTNET_AGENTKIT_CONTRACTS = {
  agentRegistry: "0xC9f3452090EEB519467DEa4a390976D38C008347",
  agentManager: "0x77F6dC5924652e32DBa0B4329De0a44a2C95691E",
  agentExecutor: "0x157C56dEdbAB6caD541109daabA4663Fc016026e",
  agentVault: "0x7cEe3142A9c6d15529C322035041af697B2B5129",
} as const;

type RuntimeMode = "provider" | "consumer";
type NetworkName = "testnet" | "mainnet" | "devnet" | "custom";
export type ConsumerUrgency = "low" | "medium" | "high";

export interface AppConfig {
  mode: RuntimeMode;
  networkName: NetworkName;
  network: NetworkConfig;
  privateKey: string;
  huggingFaceApiKey?: string;
  huggingFaceModel?: string;
  dutchAuctionAddress: string;
  dataProviderAddress: string;
  serviceRegistryAddress: string;
  providerAgentName: string;
  providerAgentDescription: string;
  providerAgentMetadata: string;
  providerAgentCapabilities: string[];
  providerAgentId?: bigint;
  consumerAuctionId?: bigint;
  consumerUrgency?: ConsumerUrgency;
  consumerTargetDataType?: string;
  consumerBudgetWei?: bigint;
  consumerSubscriptionReserveWei?: bigint;
  consumerHandlerGasLimit?: bigint;
  consumerAgentName?: string;
  consumerAgentDescription?: string;
  consumerAgentMetadata?: string;
  consumerAgentCapabilities?: string[];
  consumerAgentId?: bigint;
  agentKitIdentityEnabled: boolean;
  agentKitConfig?: AgentKitConfig;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function parseWeiAmount(name: string, defaultValue?: string): bigint | undefined {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    return undefined;
  }

  return BigInt(value);
}

function resolveNetwork(name: NetworkName): NetworkConfig {
  if (name === "custom") {
    return {
      rpcUrl: requireEnv("RPC_URL"),
      chainId: Number(requireEnv("CHAIN_ID")),
      name: process.env.NETWORK_LABEL ?? "Custom Network",
    };
  }

  return SOMNIA_NETWORKS[name];
}

function resolveAgentKitConfig(
  networkName: NetworkName,
  network: NetworkConfig,
  privateKey: string,
): AgentKitConfig | undefined {
  const agentRegistry = process.env.AGENT_REGISTRY_ADDRESS;
  const agentExecutor = process.env.AGENT_EXECUTOR_ADDRESS;

  if (networkName === "testnet") {
    return {
      network,
      privateKey,
      contracts: {
        ...TESTNET_AGENTKIT_CONTRACTS,
        agentRegistry: agentRegistry ?? TESTNET_AGENTKIT_CONTRACTS.agentRegistry,
        agentExecutor: agentExecutor ?? TESTNET_AGENTKIT_CONTRACTS.agentExecutor,
        agentManager: process.env.AGENT_MANAGER_ADDRESS ?? TESTNET_AGENTKIT_CONTRACTS.agentManager,
        agentVault: process.env.AGENT_VAULT_ADDRESS ?? TESTNET_AGENTKIT_CONTRACTS.agentVault,
      },
      logLevel: "info",
    };
  }

  if (!agentRegistry || !agentExecutor) {
    return undefined;
  }

  return {
    network,
    privateKey,
    contracts: {
      agentRegistry,
      agentExecutor,
      ...(process.env.AGENT_MANAGER_ADDRESS ? { agentManager: process.env.AGENT_MANAGER_ADDRESS } : {}),
      ...(process.env.AGENT_VAULT_ADDRESS ? { agentVault: process.env.AGENT_VAULT_ADDRESS } : {}),
    },
    logLevel: "info",
  };
}

export function loadAppConfig(argv: string[]): AppConfig {
  const modeArg = (argv[2] ?? "provider") as RuntimeMode;
  if (!["provider", "consumer"].includes(modeArg)) {
    throw new Error(`Unsupported mode: ${modeArg}`);
  }

  const networkName = (process.env.NETWORK_NAME ?? "testnet") as NetworkName;
  if (!["testnet", "mainnet", "devnet", "custom"].includes(networkName)) {
    throw new Error(`Unsupported NETWORK_NAME: ${networkName}`);
  }

  const network = resolveNetwork(networkName);
  const privateKey = requireEnv("PRIVATE_KEY");
  const providerAgentIdEnv = process.env.PROVIDER_AGENT_ID;
  const consumerAgentIdEnv = process.env.CONSUMER_AGENT_ID;
  const agentKitConfig = resolveAgentKitConfig(networkName, network, privateKey);
  const agentKitIdentityEnabled =
    readBooleanEnv("AGENTKIT_IDENTITY_ENABLED", networkName === "testnet") && !!agentKitConfig;

  const config: AppConfig = {
    mode: modeArg,
    networkName,
    network,
    privateKey,
    ...(process.env.HUGGINGFACE_API_KEY
      ? { huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY }
      : {}),
    ...(process.env.HUGGINGFACE_MODEL
      ? { huggingFaceModel: process.env.HUGGINGFACE_MODEL }
      : {}),
    dutchAuctionAddress: requireEnv("DUTCH_AUCTION_ADDRESS"),
    dataProviderAddress: requireEnv("DATA_PROVIDER_ADDRESS"),
    serviceRegistryAddress: requireEnv("SERVICE_REGISTRY_ADDRESS"),
    providerAgentName: process.env.PROVIDER_AGENT_NAME ?? "AgentMarket Provider",
    providerAgentDescription:
      process.env.PROVIDER_AGENT_DESCRIPTION ??
      "AgentMarket provider agent that watches AuctionSnapped and fulfills orders on-chain.",
    providerAgentMetadata: process.env.PROVIDER_AGENT_METADATA ?? "ipfs://agentmarket/provider-agent",
    providerAgentCapabilities: (process.env.PROVIDER_AGENT_CAPABILITIES ?? "price-data,auction-fulfillment")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    agentKitIdentityEnabled,
  };

  if (providerAgentIdEnv) {
    config.providerAgentId = BigInt(providerAgentIdEnv);
  }

  if (modeArg === "consumer") {
    if (!config.huggingFaceApiKey) {
      throw new Error("Missing required environment variable: HUGGINGFACE_API_KEY");
    }

    const urgency = (process.env.CONSUMER_URGENCY ?? "medium") as ConsumerUrgency;
    if (!["low", "medium", "high"].includes(urgency)) {
      throw new Error(`Unsupported CONSUMER_URGENCY: ${urgency}`);
    }

    config.consumerAuctionId = BigInt(requireEnv("CONSUMER_AUCTION_ID"));
    config.consumerUrgency = urgency;
    config.consumerHandlerGasLimit = BigInt(process.env.CONSUMER_HANDLER_GAS_LIMIT ?? "5000000");
    const consumerSubscriptionReserveWei = parseWeiAmount(
      "CONSUMER_SUBSCRIPTION_RESERVE_WEI",
      "32000000000000000000",
    );
    const consumerBudgetWei = parseWeiAmount("CONSUMER_BUDGET_WEI");
    const consumerTargetDataType = process.env.CONSUMER_TARGET_DATA_TYPE;
    if (consumerSubscriptionReserveWei !== undefined) {
      config.consumerSubscriptionReserveWei = consumerSubscriptionReserveWei;
    }
    if (consumerBudgetWei !== undefined) {
      config.consumerBudgetWei = consumerBudgetWei;
    }
    if (consumerTargetDataType) {
      config.consumerTargetDataType = consumerTargetDataType;
    }
    config.consumerAgentName = process.env.CONSUMER_AGENT_NAME ?? "AgentMarket Consumer";
    config.consumerAgentDescription =
      process.env.CONSUMER_AGENT_DESCRIPTION ??
      "AgentMarket consumer agent that uses Hugging Face to choose a threshold and deploys ConsumerHandler.";
    config.consumerAgentMetadata = process.env.CONSUMER_AGENT_METADATA ?? "ipfs://agentmarket/consumer-agent";
    config.consumerAgentCapabilities = (
      process.env.CONSUMER_AGENT_CAPABILITIES ?? "analyze,bid,data-consumer"
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (consumerAgentIdEnv) {
      config.consumerAgentId = BigInt(consumerAgentIdEnv);
    }
  }

  if (agentKitConfig) {
    config.agentKitConfig = agentKitConfig;
  }

  return config;
}
