"use client";

import { useEffect, useMemo } from "react";
import { createPublicClient, fallback, http, webSocket } from "viem";

import {
  addresses,
  dataProviderAbi,
  dutchAuctionAbi,
  escrowAbi,
  serviceRegistryAbi,
} from "@/lib/contracts";
import { formatScalarValue, formatStt } from "@/lib/format";
import { somniaTestnet } from "@/lib/chain";
import { useMarketplaceStore } from "@/store/marketplace";

export function useMarketplaceEvents() {
  const updateAuctionPrice = useMarketplaceStore(
    (state) => state.updateAuctionPrice,
  );
  const markAuctionSnapped = useMarketplaceStore(
    (state) => state.markAuctionSnapped,
  );
  const markAuctionExpired = useMarketplaceStore(
    (state) => state.markAuctionExpired,
  );
  const addService = useMarketplaceStore((state) => state.addService);
  const addServiceRequest = useMarketplaceStore(
    (state) => state.addServiceRequest,
  );
  const updateServiceRequest = useMarketplaceStore(
    (state) => state.updateServiceRequest,
  );
  const updateServiceStatus = useMarketplaceStore(
    (state) => state.updateServiceStatus,
  );
  const addFeedEvent = useMarketplaceStore((state) => state.addFeedEvent);

  const client = useMemo(
    () =>
      createPublicClient({
        chain: somniaTestnet,
        transport: fallback([
          webSocket(
            process.env.NEXT_PUBLIC_WS_URL ?? "wss://dream-rpc.somnia.network",
          ),
          http(somniaTestnet.rpcUrls.default.http[0]),
        ]),
      }),
    [],
  );

  useEffect(() => {
    const unwatchStarted = client.watchContractEvent({
      address: addresses.dutchAuction as `0x${string}`,
      abi: dutchAuctionAbi,
      eventName: "AuctionStarted",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.auctionId || !log.args.provider) continue;
          addFeedEvent({
            id: `${log.transactionHash}-started-${log.logIndex}`,
            kind: "auction-started",
            title: "AuctionStarted",
            description: `${log.args.dataType} auction #${log.args.auctionId.toString()} started at ${formatStt(log.args.startPrice ?? 0n)} STT`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            auctionId: log.args.auctionId.toString(),
            actorAddress: log.args.provider,
            actorLabel: "Provider",
          });
        }
      },
    });

    const unwatchTick = client.watchContractEvent({
      address: addresses.dutchAuction as `0x${string}`,
      abi: dutchAuctionAbi,
      eventName: "PriceTick",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.auctionId || !log.args.newPrice) continue;
          const auctionId = Number(log.args.auctionId);
          updateAuctionPrice(auctionId, log.args.newPrice);
          addFeedEvent({
            id: `${log.transactionHash}-tick-${log.logIndex}`,
            kind: "price-tick",
            title: "PriceTick",
            description: `Auction #${auctionId} dropped to ${formatStt(log.args.newPrice)} STT`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            auctionId: log.args.auctionId.toString(),
          });
        }
      },
    });

    const unwatchSnapped = client.watchContractEvent({
      address: addresses.dutchAuction as `0x${string}`,
      abi: dutchAuctionAbi,
      eventName: "AuctionSnapped",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.auctionId || !log.args.winner || !log.args.finalPrice)
            continue;
          markAuctionSnapped(
            Number(log.args.auctionId),
            log.args.winner,
            log.args.finalPrice,
          );
          addFeedEvent({
            id: `${log.transactionHash}-snapped-${log.logIndex}`,
            kind: "auction-snapped",
            title: "AuctionSnapped",
            description: `Auction #${log.args.auctionId.toString()} snapped at ${formatStt(log.args.finalPrice)} STT`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            auctionId: log.args.auctionId.toString(),
            actorAddress: log.args.winner,
            actorLabel: "Buyer",
          });
        }
      },
    });

    const unwatchExpired = client.watchContractEvent({
      address: addresses.dutchAuction as `0x${string}`,
      abi: dutchAuctionAbi,
      eventName: "AuctionExpired",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.auctionId) continue;
          markAuctionExpired(Number(log.args.auctionId));
          addFeedEvent({
            id: `${log.transactionHash}-expired-${log.logIndex}`,
            kind: "auction-expired",
            title: "AuctionExpired",
            description: `Auction #${log.args.auctionId.toString()} expired without a buyer`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            auctionId: log.args.auctionId.toString(),
          });
        }
      },
    });

    const unwatchDelivered = client.watchContractEvent({
      address: addresses.dataProvider as `0x${string}`,
      abi: dataProviderAbi,
      eventName: "DataDelivered",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.auctionId || !log.args.consumer || !log.args.price)
            continue;
          const knownAuction = useMarketplaceStore
            .getState()
            .auctions.find(
              (auction) => auction.id === log.args.auctionId?.toString(),
            );
          const formattedValue = knownAuction
            ? formatScalarValue(log.args.price, knownAuction.decimals)
            : log.args.price.toString();
          addFeedEvent({
            id: `${log.transactionHash}-delivered-${log.logIndex}`,
            kind: "data-delivered",
            title: "DataDelivered",
            description: `Auction #${log.args.auctionId.toString()} delivered verified ${knownAuction?.dataType ?? "market"} value ${formattedValue}`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            auctionId: log.args.auctionId.toString(),
            actorAddress: log.args.consumer,
            actorLabel: "Consumer",
          });
        }
      },
    });

    const unwatchRefunded = client.watchContractEvent({
      address: addresses.escrow as `0x${string}`,
      abi: escrowAbi,
      eventName: "PaymentRefunded",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.auctionId || !log.args.buyer || !log.args.amount)
            continue;
          addFeedEvent({
            id: `${log.transactionHash}-refunded-${log.logIndex}`,
            kind: "payment-refunded",
            title: "PaymentRefunded",
            description: `Auction #${log.args.auctionId.toString()} refunded ${formatStt(log.args.amount)} STT`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            auctionId: log.args.auctionId.toString(),
            actorAddress: log.args.buyer,
            actorLabel: "Buyer",
          });
        }
      },
    });

    const unwatchServiceRegistered = client.watchContractEvent({
      address: addresses.serviceRegistry as `0x${string}`,
      abi: serviceRegistryAbi,
      eventName: "ServiceRegistered",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.serviceId || !log.args.provider || !log.args.dataType)
            continue;
          addFeedEvent({
            id: `${log.transactionHash}-service-registered-${log.logIndex}`,
            kind: "service-registered",
            title: "ServiceRegistered",
            description: `${log.args.dataType} service #${log.args.serviceId.toString()} listed at ${formatStt(log.args.pricePerRequest ?? 0n)} STT`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            serviceId: log.args.serviceId.toString(),
            actorAddress: log.args.provider,
            actorLabel: "Provider",
          });
        }
      },
    });

    const unwatchServiceRequested = client.watchContractEvent({
      address: addresses.serviceRegistry as `0x${string}`,
      abi: serviceRegistryAbi,
      eventName: "DataRequested",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (
            !log.args.requestId ||
            !log.args.serviceId ||
            !log.args.consumer ||
            !log.args.payment
          ) {
            continue;
          }
          const service = useMarketplaceStore
            .getState()
            .services.find(
              (current) => current.id === log.args.serviceId?.toString(),
            );
          addServiceRequest({
            id: log.args.requestId.toString(),
            serviceId: log.args.serviceId.toString(),
            consumer: log.args.consumer,
            payment: log.args.payment.toString(),
            requestedAt: (log.args.blockNumber ?? 0n).toString(),
            timeoutBlocks: service?.timeoutBlocks ?? "0",
            status: 0,
            statusLabel: "Pending",
            deliveredPrice: "0",
            agentRequestId: "0",
            localRequestedAt: Date.now(),
          });
          addFeedEvent({
            id: `${log.transactionHash}-service-requested-${log.logIndex}`,
            kind: "service-requested",
            title: "DataRequested",
            description: `Service #${log.args.serviceId.toString()} received a ${formatStt(log.args.payment)} STT request`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            serviceId: log.args.serviceId.toString(),
            requestId: log.args.requestId.toString(),
            actorAddress: log.args.consumer,
            actorLabel: "Consumer",
          });
        }
      },
    });

    const unwatchServiceDelivered = client.watchContractEvent({
      address: addresses.serviceRegistry as `0x${string}`,
      abi: serviceRegistryAbi,
      eventName: "DataDelivered",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (
            !log.args.requestId ||
            !log.args.serviceId ||
            !log.args.consumer ||
            !log.args.price
          ) {
            continue;
          }
          const service = useMarketplaceStore
            .getState()
            .services.find(
              (current) => current.id === log.args.serviceId?.toString(),
            );
          addServiceRequest({
            id: log.args.requestId.toString(),
            serviceId: log.args.serviceId.toString(),
            consumer: log.args.consumer,
            payment:
              useMarketplaceStore
                .getState()
                .serviceRequests.find(
                  (request) => request.id === log.args.requestId?.toString(),
                )
                ?.payment ?? "0",
            requestedAt:
              useMarketplaceStore
                .getState()
                .serviceRequests.find(
                  (request) => request.id === log.args.requestId?.toString(),
                )
                ?.requestedAt ?? "0",
            timeoutBlocks: service?.timeoutBlocks ?? "0",
            status: 1,
            statusLabel: "Fulfilled",
            deliveredPrice: log.args.price.toString(),
            agentRequestId:
              useMarketplaceStore
                .getState()
                .serviceRequests.find(
                  (request) => request.id === log.args.requestId?.toString(),
                )
                ?.agentRequestId ?? "0",
            fulfilledAt: Date.now(),
          });
          addFeedEvent({
            id: `${log.transactionHash}-service-delivered-${log.logIndex}`,
            kind: "service-delivered",
            title: "DataDelivered",
            description: `Service #${log.args.serviceId.toString()} delivered ${service ? formatScalarValue(log.args.price, service.decimals) : log.args.price.toString()} ${service?.dataType ?? "value"}`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            serviceId: log.args.serviceId.toString(),
            requestId: log.args.requestId.toString(),
            actorAddress: log.args.consumer,
            actorLabel: "Consumer",
          });
        }
      },
    });

    const unwatchServiceRefunded = client.watchContractEvent({
      address: addresses.serviceRegistry as `0x${string}`,
      abi: serviceRegistryAbi,
      eventName: "RequestRefunded",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.requestId || !log.args.consumer || !log.args.payment) {
            continue;
          }
          updateServiceRequest(log.args.requestId.toString(), {
            status: 2,
            statusLabel: "Refunded",
          });
          addFeedEvent({
            id: `${log.transactionHash}-service-refunded-${log.logIndex}`,
            kind: "service-refunded",
            title: "RequestRefunded",
            description: `Service request #${log.args.requestId.toString()} refunded ${formatStt(log.args.payment)} STT`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            requestId: log.args.requestId.toString(),
            actorAddress: log.args.consumer,
            actorLabel: "Consumer",
          });
        }
      },
    });

    const unwatchServiceStatusChanged = client.watchContractEvent({
      address: addresses.serviceRegistry as `0x${string}`,
      abi: serviceRegistryAbi,
      eventName: "ServiceStatusChanged",
      pollingInterval: 2_000,
      onLogs: (logs) => {
        for (const log of logs) {
          if (!log.args.serviceId || log.args.newStatus === undefined) {
            continue;
          }
          const statusLabel =
            Number(log.args.newStatus) === 1
              ? "Paused"
              : Number(log.args.newStatus) === 2
                ? "Deactivated"
                : "Active";
          updateServiceStatus(Number(log.args.serviceId), statusLabel);
          addFeedEvent({
            id: `${log.transactionHash}-service-status-${log.logIndex}`,
            kind: "service-status-changed",
            title: "ServiceStatusChanged",
            description: `Service #${log.args.serviceId.toString()} is now ${statusLabel}`,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            serviceId: log.args.serviceId.toString(),
          });
        }
      },
    });

    return () => {
      unwatchStarted();
      unwatchTick();
      unwatchSnapped();
      unwatchExpired();
      unwatchDelivered();
      unwatchRefunded();
      unwatchServiceRegistered();
      unwatchServiceRequested();
      unwatchServiceDelivered();
      unwatchServiceRefunded();
      unwatchServiceStatusChanged();
    };
  }, [
    addService,
    addServiceRequest,
    addFeedEvent,
    client,
    markAuctionExpired,
    markAuctionSnapped,
    updateServiceRequest,
    updateServiceStatus,
    updateAuctionPrice,
  ]);
}
