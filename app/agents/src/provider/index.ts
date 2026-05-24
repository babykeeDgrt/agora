import { ethers } from "ethers";
import { Agent, OnChainTrigger } from "somnia-agent-kit";

import type { AppConfig } from "../shared/config";
import { createRuntimeContracts } from "../shared/contracts";

interface AgentIdentity {
  runtimeAgent: Agent;
  agentId: bigint;
}

function now(): number {
  return Date.now();
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(value);
  }

  if (typeof value === "string") {
    return BigInt(value);
  }

  throw new Error(`Cannot convert value to bigint: ${String(value)}`);
}

function extractAuctionId(event: { args?: unknown[] | Record<string, unknown> }): bigint {
  if (Array.isArray(event.args) && event.args[0] !== undefined) {
    return asBigInt(event.args[0]);
  }

  if (event.args && typeof event.args === "object" && "auctionId" in event.args) {
    return asBigInt((event.args as Record<string, unknown>).auctionId);
  }

  throw new Error("AuctionSnapped event did not include auctionId");
}

function extractServiceRequestEvent(
  event: { args?: unknown[] | Record<string, unknown> },
): { requestId: bigint; serviceId: bigint } {
  if (Array.isArray(event.args) && event.args[0] !== undefined && event.args[1] !== undefined) {
    return {
      requestId: asBigInt(event.args[0]),
      serviceId: asBigInt(event.args[1]),
    };
  }

  if (event.args && typeof event.args === "object") {
    const args = event.args as Record<string, unknown>;
    if (args.requestId !== undefined && args.serviceId !== undefined) {
      return {
        requestId: asBigInt(args.requestId),
        serviceId: asBigInt(args.serviceId),
      };
    }
  }

  throw new Error("DataRequested event did not include requestId and serviceId");
}

async function ensureAgentIdentity(
  config: AppConfig,
  signer: ethers.Wallet | ethers.Signer,
  kit: NonNullable<Awaited<ReturnType<typeof createRuntimeContracts>>["kit"]>,
): Promise<AgentIdentity> {
  const owner = await signer.getAddress();
  const runtimeAgent = new Agent({
    name: config.providerAgentName,
    description: config.providerAgentDescription,
    owner,
    capabilities: config.providerAgentCapabilities,
  });

  await runtimeAgent.initialize(kit.contracts.registry, kit.contracts.executor);

  const registry = kit.contracts.registry;
  const targetAgentId = config.providerAgentId;

  if (targetAgentId !== undefined) {
    const tx = await registry.updateAgent(
      targetAgentId,
      config.providerAgentName,
      config.providerAgentDescription,
      config.providerAgentMetadata,
      config.providerAgentCapabilities,
    );
    await tx.wait();
    return { runtimeAgent, agentId: targetAgentId };
  }

  const ownerAgentIds = (await registry.getOwnerAgents(owner)) as bigint[];

  for (const agentId of ownerAgentIds) {
    const existing = await registry.getAgent(agentId);
    if (existing.name === config.providerAgentName) {
      const tx = await registry.updateAgent(
        agentId,
        config.providerAgentName,
        config.providerAgentDescription,
        config.providerAgentMetadata,
        config.providerAgentCapabilities,
      );
      await tx.wait();
      return { runtimeAgent, agentId };
    }
  }

  const beforeIds = new Set(ownerAgentIds.map((agentId) => agentId.toString()));
  const tx = await registry.registerAgent(
    config.providerAgentName,
    config.providerAgentDescription,
    config.providerAgentMetadata,
    config.providerAgentCapabilities,
  );
  await tx.wait();
  const afterIds = (await registry.getOwnerAgents(owner)) as bigint[];
  const createdAgentId = afterIds.find((agentId) => !beforeIds.has(agentId.toString()));

  if (createdAgentId === undefined) {
    throw new Error("Agent registration transaction succeeded but no new agent id was found");
  }

  return { runtimeAgent, agentId: createdAgentId };
}

async function computeAuctionFulfillmentDeposit(
  dataProvider: Awaited<ReturnType<typeof createRuntimeContracts>>["dataProvider"],
  platform: Awaited<ReturnType<typeof createRuntimeContracts>>["auctionPlatform"],
): Promise<bigint> {
  const reserve = (await platform.getRequestDeposit()) as bigint;
  const perAgentExecutionCost = (await dataProvider.PER_AGENT_EXECUTION_COST()) as bigint;
  const subcommitteeSize = (await dataProvider.SUBCOMMITTEE_SIZE()) as bigint;

  return reserve + perAgentExecutionCost * subcommitteeSize;
}

async function computeServiceFulfillmentDeposit(
  serviceRegistry: Awaited<ReturnType<typeof createRuntimeContracts>>["serviceRegistry"],
  platform: Awaited<ReturnType<typeof createRuntimeContracts>>["servicePlatform"],
): Promise<bigint> {
  const reserve = (await platform.getRequestDeposit()) as bigint;
  const perAgentExecutionCost = (await serviceRegistry.PER_AGENT_EXECUTION_COST()) as bigint;
  const subcommitteeSize = (await serviceRegistry.SUBCOMMITTEE_SIZE()) as bigint;

  return reserve + perAgentExecutionCost * subcommitteeSize;
}

export async function runProviderAgent(config: AppConfig): Promise<void> {
  const runtime = await createRuntimeContracts(config);
  const signerAddress = (await runtime.provider.getAddress()).toLowerCase();
  const ownedServiceIds = new Set(
    ((await runtime.serviceRegistry.getProviderServices(signerAddress)) as bigint[]).map((serviceId) =>
      serviceId.toString(),
    ),
  );

  let identity: AgentIdentity | undefined;
  if (runtime.kit) {
    identity = await ensureAgentIdentity(config, runtime.provider, runtime.kit);
    console.log(
      `[provider] AgentKit identity ready: agentId=${identity.agentId.toString()} name="${config.providerAgentName}"`,
    );
  } else {
    console.log("[provider] AgentKit identity disabled. Running as event listener only.");
  }

  const handleAuctionSnapped = async (event: { args?: unknown[] | Record<string, unknown> }) => {
    const auctionId = extractAuctionId(event);
    const startedAt = now();

    try {
      const auction = (await runtime.dutchAuction.getAuction(auctionId)) as {
        provider: string;
      };

      if (auction.provider.toLowerCase() !== signerAddress) {
        return;
      }

      const pendingRequest = (await runtime.dataProvider.pendingRequests(auctionId)) as boolean;
      if (pendingRequest) {
        console.log(`[provider] auction ${auctionId.toString()} already has a pending request`);
        return;
      }

      const deposit = await computeAuctionFulfillmentDeposit(
        runtime.dataProvider,
        runtime.auctionPlatform,
      );
      const tx = await runtime.dataProvider.fulfillOrder(auctionId, { value: deposit });
      const receipt = await tx.wait();

      console.log(
        `[provider] fulfilled auction ${auctionId.toString()} in tx ${receipt?.hash ?? tx.hash} with deposit ${ethers.formatEther(deposit)} STT`,
      );

      if (runtime.kit && identity) {
        const executionTimeMs = BigInt(Math.max(1, now() - startedAt));
        const metricsTx = await runtime.kit.contracts.registry.recordExecution(
          identity.agentId,
          true,
          executionTimeMs,
        );
        await metricsTx.wait();
      }
    } catch (error) {
      console.error(`[provider] failed to fulfill auction ${auctionId.toString()}: ${stringifyError(error)}`);

      if (runtime.kit && identity) {
        const executionTimeMs = BigInt(Math.max(1, now() - startedAt));
        try {
          const metricsTx = await runtime.kit.contracts.registry.recordExecution(
            identity.agentId,
            false,
            executionTimeMs,
          );
          await metricsTx.wait();
        } catch (metricsError) {
          console.error(`[provider] failed to record execution metrics: ${stringifyError(metricsError)}`);
        }
      }
    }
  };

  const handleServiceRequested = async (event: { args?: unknown[] | Record<string, unknown> }) => {
    const { requestId, serviceId } = extractServiceRequestEvent(event);
    const startedAt = now();

    try {
      if (!ownedServiceIds.has(serviceId.toString())) {
        return;
      }

      const service = await runtime.serviceRegistry.getService(serviceId);
      if (service.provider.toLowerCase() !== signerAddress) {
        return;
      }

      const request = await runtime.serviceRegistry.getRequest(requestId);
      if (request.agentRequestId !== 0n) {
        console.log(`[provider] service request ${requestId.toString()} already submitted`);
        return;
      }

      const deposit = await computeServiceFulfillmentDeposit(
        runtime.serviceRegistry,
        runtime.servicePlatform,
      );
      const tx = await runtime.serviceRegistry.fulfillRequest(requestId, {
        value: deposit,
      });
      const receipt = await tx.wait();

      console.log(
        `[provider] fulfilled service request ${requestId.toString()} for service ${serviceId.toString()} in tx ${receipt?.hash ?? tx.hash} with deposit ${ethers.formatEther(deposit)} STT`,
      );

      if (runtime.kit && identity) {
        const executionTimeMs = BigInt(Math.max(1, now() - startedAt));
        const metricsTx = await runtime.kit.contracts.registry.recordExecution(
          identity.agentId,
          true,
          executionTimeMs,
        );
        await metricsTx.wait();
      }
    } catch (error) {
      console.error(
        `[provider] failed to fulfill service request ${requestId.toString()} for service ${serviceId.toString()}: ${stringifyError(error)}`,
      );

      if (runtime.kit && identity) {
        const executionTimeMs = BigInt(Math.max(1, now() - startedAt));
        try {
          const metricsTx = await runtime.kit.contracts.registry.recordExecution(
            identity.agentId,
            false,
            executionTimeMs,
          );
          await metricsTx.wait();
        } catch (metricsError) {
          console.error(`[provider] failed to record execution metrics: ${stringifyError(metricsError)}`);
        }
      }
    }
  };

  let auctionTrigger: OnChainTrigger | undefined;
  let serviceTrigger: OnChainTrigger | undefined;
  let directAuctionListener: ((...args: unknown[]) => void) | undefined;
  let directServiceListener: ((...args: unknown[]) => void) | undefined;

  if (runtime.kit) {
    auctionTrigger = new OnChainTrigger(
      runtime.kit.getChainClient(),
      runtime.dutchAuction,
      "AuctionSnapped",
    );
    serviceTrigger = new OnChainTrigger(
      runtime.kit.getChainClient(),
      runtime.serviceRegistry,
      "DataRequested",
    );
    await auctionTrigger.start(handleAuctionSnapped);
    await serviceTrigger.start(handleServiceRequested);
  } else {
    directAuctionListener = async (...args: unknown[]) => {
      const event = args[args.length - 1];
      await handleAuctionSnapped(event as { args?: unknown[] | Record<string, unknown> });
    };
    directServiceListener = async (...args: unknown[]) => {
      const event = args[args.length - 1];
      await handleServiceRequested(event as { args?: unknown[] | Record<string, unknown> });
    };
    runtime.dutchAuction.on("AuctionSnapped", directAuctionListener);
    runtime.serviceRegistry.on("DataRequested", directServiceListener);
  }

  console.log(`[provider] watching AuctionSnapped on ${config.dutchAuctionAddress}`);
  console.log(`[provider] watching DataRequested on ${config.serviceRegistryAddress}`);
  console.log(
    `[provider] managing services: ${ownedServiceIds.size === 0 ? "none" : Array.from(ownedServiceIds).join(", ")}`,
  );

  const stop = async () => {
    if (auctionTrigger) {
      await auctionTrigger.stop();
    }
    if (serviceTrigger) {
      await serviceTrigger.stop();
    }
    if (directAuctionListener) {
      runtime.dutchAuction.off("AuctionSnapped", directAuctionListener);
    }
    if (directServiceListener) {
      runtime.serviceRegistry.off("DataRequested", directServiceListener);
    }
    if (identity) {
      await identity.runtimeAgent.stop().catch(() => undefined);
    }
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void stop();
  });
  process.once("SIGTERM", () => {
    void stop();
  });
}
