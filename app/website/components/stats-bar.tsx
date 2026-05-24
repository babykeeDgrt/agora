"use client";

import { formatStt } from "@/lib/format";
import type { MarketplaceStats } from "@/store/marketplace";

export function StatsBar({ stats }: { stats: MarketplaceStats }) {
  const items = [
    { label: "Total Auctions", value: String(stats.totalAuctions) },
    { label: "Total Volume", value: `${formatStt(stats.totalVolumeWei)} STT` },
    { label: "Active Agents", value: String(stats.activeAgents) },
    { label: "AI Plans", value: String(stats.aiPlansGenerated) },
    { label: "Avg Delivery", value: `${stats.avgDeliverySeconds}s` },
  ];

  return (
    <div className="grid gap-3 rounded-[2rem] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1.5rem] border border-border bg-background px-4 py-4"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            {item.label}
          </p>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight sm:text-2xl">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
