"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { api } from "@/lib/api";
import { useMarketplaceStore } from "@/store/marketplace";

export function useMarketplaceStats() {
  const auctions = useMarketplaceStore((state) => state.auctions);
  const feed = useMarketplaceStore((state) => state.feed);
  const setStats = useMarketplaceStore((state) => state.setStats);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 15_000,
  });

  const stats = useMemo(() => {
    const totalAuctions = auctions.length;
    const totalVolumeWei = auctions.reduce((sum, auction) => {
      if (auction.statusKey !== "SNAPPED") return sum;
      return sum + BigInt(auction.currentPrice);
    }, 0n);

    const agentAddresses = new Set<string>();
    for (const auction of auctions) {
      agentAddresses.add(auction.provider.toLowerCase());
      if (
        auction.winner &&
        auction.winner !== "0x0000000000000000000000000000000000000000"
      ) {
        agentAddresses.add(auction.winner.toLowerCase());
      }
    }

    const snapTimes = new Map<string, number>();
    const deliveryDurations: number[] = [];

    const orderedFeed = [...feed].sort((left, right) => left.timestamp - right.timestamp);
    for (const event of orderedFeed) {
      if (event.kind === "auction-snapped" && event.auctionId) {
        snapTimes.set(event.auctionId, event.timestamp);
      }

      if (event.kind === "data-delivered" && event.auctionId) {
        const snappedAt = snapTimes.get(event.auctionId);
        if (snappedAt) {
          deliveryDurations.push(
            Math.max(0, Math.round((event.timestamp - snappedAt) / 1000)),
          );
        }
      }
    }

    const avgDeliverySeconds =
      deliveryDurations.length > 0
        ? Math.round(
            deliveryDurations.reduce((sum, value) => sum + value, 0) /
              deliveryDurations.length,
          )
        : 0;

    return {
      totalAuctions,
      totalVolumeWei,
      activeAgents: agentAddresses.size,
      avgDeliverySeconds,
      aiPlansGenerated: feed.filter((event) => event.kind === "ai-planned")
        .length,
    };
  }, [auctions, feed]);

  useEffect(() => {
    setStats(stats);
  }, [setStats, stats]);

  return {
    ...healthQuery,
    stats,
  };
}
