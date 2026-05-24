"use client";

import { Copy, ExternalLink } from "lucide-react";
import { explorerAddressLink, explorerTxLink, formatRelativeTime, shortenAddress } from "@/lib/format";
import type { FeedEvent } from "@/store/marketplace";

const icons: Record<FeedEvent["kind"], string> = {
  "ai-planned": "∆",
  "consumer-deployed": "□",
  "auction-started": "○",
  "price-tick": "•",
  "auction-snapped": "◉",
  "auction-expired": "×",
  "data-delivered": "◇",
  "payment-refunded": "↩",
  "service-registered": "▣",
  "service-requested": "→",
  "service-delivered": "⬢",
  "service-refunded": "↺",
  "service-status-changed": "≋",
};

export function FeedEventRow({ event }: { event: FeedEvent }) {
  return (
    <article className="grid gap-3 rounded-[1.5rem] border border-border bg-background px-4 py-4 sm:grid-cols-[auto,1fr,auto] sm:items-start">
      <div className="flex size-9 items-center justify-center rounded-full border border-border font-mono text-sm">
        {icons[event.kind]}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{event.title}</p>
          {event.auctionId ? (
            <span className="rounded-full border border-border px-2 py-1 font-mono text-[11px] text-muted">
              #{event.auctionId}
            </span>
          ) : null}
        </div>
        <p className="mt-2 break-words text-sm leading-6 text-muted">
          {event.description}
        </p>
        {event.actorAddress ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-3 py-2 font-mono text-xs text-foreground">
              {event.actorLabel ?? "Address"} {shortenAddress(event.actorAddress)}
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(event.actorAddress as string)}
              className="rounded-full border border-border p-2 text-muted transition hover:text-foreground"
              aria-label={`Copy ${event.actorLabel ?? "address"}`}
            >
              <Copy className="size-3" />
            </button>
            <a
              href={explorerAddressLink(event.actorAddress)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border p-2 text-muted transition hover:text-foreground"
            >
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">
          {formatRelativeTime(event.timestamp)}
        </p>
        {event.txHash ? (
          <a
            href={explorerTxLink(event.txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs text-muted transition hover:border-white/20 hover:text-foreground"
          >
            tx
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
