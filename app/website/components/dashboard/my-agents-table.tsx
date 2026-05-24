"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { explorerAddressLink, formatStt, shortenAddress } from "@/lib/format";
import type { Auction } from "@/store/marketplace";

export interface LocalConsumerAgent {
  owner?: string;
  address: string;
  auctionId?: string;
  dataType: string;
  model?: string;
  urgency?: "low" | "medium" | "high";
  thresholdWei: string;
  baselineThresholdWei?: string;
  budgetWei: string;
  rationale?: string;
  deployedAt: number;
}

export function MyAgentsTable({
  agents,
  auctions,
  apiWalletAddress,
}: {
  agents: LocalConsumerAgent[];
  auctions: Auction[];
  apiWalletAddress?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const localAgents = useMemo(
    () => [...agents].sort((left, right) => right.deployedAt - left.deployedAt),
    [agents],
  );

  const apiWalletAuctions = useMemo(() => {
    if (!apiWalletAddress) return [];
    return auctions.filter(
      (auction) =>
        auction.provider.toLowerCase() === apiWalletAddress.toLowerCase(),
    );
  }, [apiWalletAddress, auctions]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr,1fr]">
      <div className="rounded-[2rem] border border-border bg-surface p-5">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            Local Consumer Deployments
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight">
            Browser-tracked Agora API deployments
          </h3>
        </div>
        <div className="space-y-3">
          {localAgents.map((agent) => {
            const isOpen = expanded === agent.address;
            return (
              <div
                key={agent.address}
                className="rounded-[1.5rem] border border-border bg-background"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((value) =>
                      value === agent.address ? null : agent.address,
                    )
                  }
                  className="grid w-full gap-3 px-4 py-4 text-left sm:grid-cols-[1.2fr,0.8fr,0.8fr,auto] sm:items-center"
                >
                  <div>
                    <p className="font-mono text-sm text-foreground">
                      {shortenAddress(agent.address)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">
                      {agent.dataType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">
                      Auction
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {agent.auctionId ? `#${agent.auctionId}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">
                      Threshold
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {formatStt(agent.thresholdWei)} STT
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">
                      Budget
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {formatStt(agent.budgetWei)} STT
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.22em] text-muted">
                    {isOpen ? "Hide" : "Expand"}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-border px-4 py-4 text-sm text-muted">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={explorerAddressLink(agent.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs transition hover:border-white/20 hover:text-foreground"
                      >
                        Explorer
                        <ExternalLink className="size-3" />
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(agent.address)}
                      >
                        <Copy className="size-3" />
                        Copy
                      </Button>
                    </div>
                    {agent.rationale ? (
                      <p className="mt-3 leading-6">{agent.rationale}</p>
                    ) : null}
                    {agent.model ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted">
                        Model: {agent.model}
                      </p>
                    ) : null}
                    {agent.urgency ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted">
                        Urgency: {agent.urgency}
                      </p>
                    ) : null}
                    {agent.baselineThresholdWei ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted">
                        Rule baseline: {formatStt(agent.baselineThresholdWei)} STT
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted">
                      Owner on-chain: Agora API wallet
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
          {localAgents.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-6 text-sm text-muted">
              No consumer agents tracked in this browser yet. Deploy one from the
              Spawn Agent page.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[2rem] border border-border bg-surface p-5">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            Agora API Auctions
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight">
            Auctions created through the Agora backend wallet
          </h3>
        </div>
        {apiWalletAddress ? (
          <p className="mb-4 font-mono text-xs text-muted">
            {shortenAddress(apiWalletAddress)}
          </p>
        ) : null}
        <div className="space-y-3">
          {apiWalletAuctions.map((auction) => (
            <div
              key={auction.id}
              className="grid gap-3 rounded-[1.5rem] border border-border bg-background px-4 py-4 sm:grid-cols-[auto,1fr,auto]"
            >
              <div>
                <p className="font-mono text-sm text-foreground">#{auction.id}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">
                  {auction.dataType}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground">{auction.statusKey}</p>
                <p className="mt-1 text-xs text-muted">
                  Current {formatStt(auction.currentPrice)} STT
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-foreground">
                  {auction.statusKey === "SNAPPED"
                    ? `${formatStt(auction.currentPrice)} STT`
                    : "0.0000 STT"}
                </p>
                <p className="mt-1 text-xs text-muted">earned</p>
              </div>
            </div>
          ))}
          {apiWalletAuctions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-6 text-sm text-muted">
              No Agora backend-created provider auctions found yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
