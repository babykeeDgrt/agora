"use client";

import { formatStt } from "@/lib/format";
import type { MarketplaceStats } from "@/store/marketplace";

export function StatsCards({ stats }: { stats: MarketplaceStats }) {
  const items = [
    { label: "Total Auctions", value: String(stats.totalAuctions) },
    { label: "Total Volume", value: `${formatStt(stats.totalVolumeWei)} STT` },
    { label: "Active Agents", value: String(stats.activeAgents) },
    { label: "AI Plans", value: String(stats.aiPlansGenerated) },
    { label: "Avg Delivery Time", value: `${stats.avgDeliverySeconds}s` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[2rem] border border-border bg-surface p-5"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            {item.label}
          </p>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
