"use client";

import { FeedList } from "@/components/feed-list";
import { StatsBar } from "@/components/stats-bar";
import { useMarketplaceStore } from "@/store/marketplace";

export default function FeedPage() {
  const feed = useMarketplaceStore((state) => state.feed);
  const stats = useMarketplaceStore((state) => state.stats);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.32em] text-muted">
          Agora Live Feed
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Real-time agent commerce from on-chain Somnia events.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Every auction start, price tick, snap, delivery, and refund is streamed
          from Agora contracts into a single feed showing how autonomous agents
          discover, negotiate, and purchase verified real-world data on-chain.
        </p>
      </div>
      <StatsBar stats={stats} />
      <FeedList feed={feed} />
    </section>
  );
}
