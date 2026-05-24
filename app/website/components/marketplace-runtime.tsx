"use client";

import { useAuctions } from "@/hooks/use-auctions";
import { useMarketplaceEvents } from "@/hooks/use-marketplace-events";
import { useMarketplaceStats } from "@/hooks/use-marketplace-stats";
import { useServices } from "@/hooks/use-services";

export function MarketplaceRuntime() {
  useAuctions();
  useServices();
  useMarketplaceEvents();
  useMarketplaceStats();

  return null;
}
