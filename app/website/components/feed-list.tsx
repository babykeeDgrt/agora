"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { FeedEventRow } from "@/components/feed-event";
import { Button } from "@/components/ui/button";
import type { FeedEvent } from "@/store/marketplace";

type FilterKey = "ALL" | "SNAPS" | "DELIVERIES" | "REFUNDS";

const filters: FilterKey[] = ["ALL", "SNAPS", "DELIVERIES", "REFUNDS"];

function matchesFilter(filter: FilterKey, event: FeedEvent) {
  if (filter === "ALL") return true;
  if (filter === "SNAPS") {
    return (
      event.kind === "auction-snapped" ||
      event.kind === "price-tick" ||
      event.kind === "ai-planned" ||
      event.kind === "consumer-deployed"
    );
  }
  if (filter === "DELIVERIES") return event.kind === "data-delivered";
  return event.kind === "payment-refunded";
}

export function FeedList({ feed }: { feed: FeedEvent[] }) {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [showTicks, setShowTicks] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickRef = useRef(true);

  const filteredFeed = useMemo(() => {
    return feed.filter((event) => {
      if (!showTicks && event.kind === "price-tick" && filter === "ALL") {
        return false;
      }
      return matchesFilter(filter, event);
    });
  }, [feed, filter, showTicks]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldStickRef.current) return;
    container.scrollTo({ top: 0, behavior: "smooth" });
  }, [filteredFeed.length]);

  return (
    <div className="flex flex-1 flex-col gap-4 rounded-[2rem] border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((value) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={
                  active
                    ? "rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black"
                    : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted transition hover:text-foreground"
                }
              >
                {value}
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTicks((value) => !value)}
        >
          {showTicks ? "Hide Price Ticks" : "Show Price Ticks"}
        </Button>
      </div>

      <div
        ref={containerRef}
        onScroll={(event) => {
          shouldStickRef.current = event.currentTarget.scrollTop < 80;
        }}
        className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
      >
        {filteredFeed.length === 0 ? (
          <div className="rounded-[1.5rem] border border-border bg-background px-4 py-6 text-sm text-muted">
            No feed events yet. Start an auction or wait for the next on-chain event.
          </div>
        ) : null}
        {filteredFeed.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <FeedEventRow event={event} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
