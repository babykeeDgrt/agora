"use client";

import Image from "next/image";
import { RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { AuctionGrid } from "@/components/auction-grid";
import { RegisterServiceModal } from "@/components/register-service-modal";
import { ServiceGrid } from "@/components/service-grid";
import { StartAuctionModal } from "@/components/start-auction-modal";
import { Button } from "@/components/ui/button";
import { useAuctions } from "@/hooks/use-auctions";
import { useServices } from "@/hooks/use-services";
import { useMarketplaceStore } from "@/store/marketplace";

type FilterKey = "ALL" | "LIVE" | "SNAPPED" | "EXPIRED";
type TabKey = "AUCTIONS" | "SERVICES";

const filters: FilterKey[] = ["ALL", "LIVE", "SNAPPED", "EXPIRED"];

export default function Home() {
  const { isLoading, isRefetching, refetch, error } = useAuctions();
  const {
    isLoading: isServicesLoading,
    isRefetching: isServicesRefetching,
    refetch: refetchServices,
    error: servicesError,
  } = useServices();
  const auctions = useMarketplaceStore((state) => state.auctions);
  const services = useMarketplaceStore((state) => state.services);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [activeTab, setActiveTab] = useState<TabKey>("AUCTIONS");

  const filteredAuctions = useMemo(() => {
    if (activeFilter === "ALL") return auctions;
    return auctions.filter((auction) => auction.statusKey === activeFilter);
  }, [activeFilter, auctions]);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-muted">
              Agora
            </p>
            <div className="flex items-center gap-4">
              <span className="relative hidden size-14 overflow-hidden rounded-full border border-border bg-background sm:block">
                <Image
                  src="/agora_logo.jpg"
                  alt="Agora logo"
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </span>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                The data layer for autonomous AI agents.
              </h1>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
              Built on Somnia, Agora lets agents discover, negotiate, and purchase
              verified real-world data entirely on-chain using autonomous Dutch
              auctions, Somnia Reactivity, and trustless API delivery through
              validator-backed agent execution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() =>
                activeTab === "AUCTIONS" ? refetch() : refetchServices()
              }
              disabled={isRefetching || isServicesRefetching}
            >
              <RefreshCcw
                className={
                  isRefetching || isServicesRefetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />
              Refresh
            </Button>
            {activeTab === "AUCTIONS" ? (
              <StartAuctionModal />
            ) : (
              <RegisterServiceModal />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {(["AUCTIONS", "SERVICES"] as TabKey[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={
                  active
                    ? "rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black"
                    : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted transition hover:text-foreground"
                }
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {activeTab === "AUCTIONS" ? (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const active = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={
                      active
                        ? "rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black"
                        : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted transition hover:text-foreground"
                    }
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted">
              Always-on services stay listed and can fulfill unlimited requests.
            </div>
          )}
          <div className="text-xs uppercase tracking-[0.22em] text-muted">
            {activeTab === "AUCTIONS"
              ? isLoading
                ? "Loading auctions"
                : `${filteredAuctions.length} visible`
              : isServicesLoading
                ? "Loading services"
                : `${services.length} active`}
          </div>
        </div>

        {activeTab === "AUCTIONS" && error ? (
          <div className="rounded-3xl border border-border bg-background px-4 py-6 text-sm text-muted">
            Failed to load auctions: {error.message}
          </div>
        ) : null}
        {activeTab === "SERVICES" && servicesError ? (
          <div className="rounded-3xl border border-border bg-background px-4 py-6 text-sm text-muted">
            Failed to load services: {servicesError.message}
          </div>
        ) : null}

        {activeTab === "AUCTIONS" ? (
          <AuctionGrid
            auctions={filteredAuctions}
            isLoading={isLoading}
            emptyMessage="No active auctions. Providers can start one below."
          />
        ) : (
          <ServiceGrid
            services={services}
            isLoading={isServicesLoading}
            emptyMessage="No active services. Providers can register one below."
          />
        )}
      </div>
    </section>
  );
}
