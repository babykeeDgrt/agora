"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { MyAgentsTable, type LocalConsumerAgent } from "@/components/dashboard/my-agents-table";
import { ProvidersTable } from "@/components/dashboard/providers-table";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { api } from "@/lib/api";
import { useMarketplaceStore } from "@/store/marketplace";

type TabKey = "GLOBAL" | "LOCAL_AGENTS";

export default function DashboardPage() {
  const [tab, setTab] = useState<TabKey>("GLOBAL");
  const [localAgents, setLocalAgents] = useState<LocalConsumerAgent[]>([]);
  const auctions = useMarketplaceStore((state) => state.auctions);
  const feed = useMarketplaceStore((state) => state.feed);
  const stats = useMarketplaceStore((state) => state.stats);
  const health = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
  });

  useEffect(() => {
    const load = () => {
      try {
        const raw = window.localStorage.getItem("agora:consumer-agents");
        setLocalAgents(raw ? (JSON.parse(raw) as LocalConsumerAgent[]) : []);
      } catch {
        setLocalAgents([]);
      }
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("agora:agents-updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("agora:agents-updated", load);
    };
  }, []);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted">
              Agora Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Throughput, provider performance, and local autonomous agent state.
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["GLOBAL", "LOCAL_AGENTS"] as TabKey[]).map((value) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={
                    active
                      ? "rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black"
                      : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted transition hover:text-foreground"
                  }
                >
                  {value === "LOCAL_AGENTS" ? "LOCAL AGENTS" : value}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === "GLOBAL" ? (
        <div className="space-y-6">
          <StatsCards stats={stats} />
          <VolumeChart feed={feed} />
          <ProvidersTable auctions={auctions} feed={feed} />
        </div>
      ) : (
        <MyAgentsTable
          agents={localAgents}
          auctions={auctions}
          apiWalletAddress={health.data?.walletAddress}
        />
      )}
    </section>
  );
}
