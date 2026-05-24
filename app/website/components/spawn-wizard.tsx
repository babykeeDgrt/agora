"use client";

import { motion } from "framer-motion";
import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseEther } from "viem";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { useConsumerPlan } from "@/hooks/use-consumer-plan";
import { explorerAddressLink, formatStt, shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSpawnAgent } from "@/hooks/use-spawn-agent";
import { useMarketplaceStore } from "@/store/marketplace";
import type { LocalConsumerAgent } from "@/components/dashboard/my-agents-table";

type DataType = "ETH/USD" | "BTC/USD" | "SOL/USD";
type Urgency = "low" | "medium" | "high";
type Step = 1 | 2 | 3 | 4;

const dataTypes: DataType[] = ["ETH/USD", "BTC/USD", "SOL/USD"];
const urgencies: Urgency[] = ["low", "medium", "high"];

function urgencyLabel(urgency: Urgency) {
  if (urgency === "low") return "Low";
  if (urgency === "medium") return "Medium";
  return "High";
}

function strategyLabel(urgency: Urgency) {
  if (urgency === "low") return "Conservative";
  if (urgency === "medium") return "Balanced";
  return "Aggressive";
}

export function SpawnWizard() {
  const { address } = useAccount();
  const auctions = useMarketplaceStore((state) => state.auctions);
  const addFeedEvent = useMarketplaceStore((state) => state.addFeedEvent);
  const [step, setStep] = useState<Step>(1);
  const [dataType, setDataType] = useState<DataType>("ETH/USD");
  const [budget, setBudget] = useState("10");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const spawn = useSpawnAgent();
  const budgetWei = useMemo(() => {
    try {
      return parseEther(budget || "0").toString();
    } catch {
      return undefined;
    }
  }, [budget]);

  const persistAgent = (agent: LocalConsumerAgent) => {
    if (typeof window === "undefined") return;
    const key = "agora:consumer-agents";
    const raw = window.localStorage.getItem(key);
    const existing = raw ? ((JSON.parse(raw) as LocalConsumerAgent[])) : [];
    const next = [agent, ...existing.filter((item) => item.address !== agent.address)].slice(0, 50);
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("agora:agents-updated"));
  };

  const liveAuction = useMemo(() => {
    return auctions
      .filter(
        (auction) =>
          auction.statusKey === "LIVE" && auction.dataType === dataType,
      )
      .sort(
        (left, right) =>
          Number(left.currentPrice) - Number(right.currentPrice),
      )[0];
  }, [auctions, dataType]);

  const plan = useConsumerPlan({
    auctionId: liveAuction?.id,
    budgetWei,
    urgency,
    targetDataType: dataType,
  });

  const baselineThresholdWei = useMemo(() => {
    if (!liveAuction || !budgetWei) return undefined;
    try {
      const floor = BigInt(liveAuction.floorPrice);
      const current = BigInt(liveAuction.currentPrice);
      const budgetCap = BigInt(budgetWei);
      const affordableCap = current < budgetCap ? current : budgetCap;
      if (affordableCap < floor) return undefined;
      if (urgency === "low") return floor.toString();
      if (urgency === "high") return affordableCap.toString();
      return (floor + (affordableCap - floor) / 2n).toString();
    } catch {
      return undefined;
    }
  }, [budgetWei, liveAuction, urgency]);

  const aiDeltaWei = useMemo(() => {
    if (!plan.data || !baselineThresholdWei) return undefined;
    try {
      return (
        BigInt(plan.data.snapThresholdWei) - BigInt(baselineThresholdWei)
      ).toString();
    } catch {
      return undefined;
    }
  }, [baselineThresholdWei, plan.data]);

  const recommendationMessage = useMemo(() => {
    let parsedBudget = 0n;
    try {
      parsedBudget = parseEther(budget || "0");
    } catch {
      return "Enter a valid STT budget.";
    }

    if (!liveAuction) {
      return `No live ${dataType} auction exists right now.`;
    }

    const floor = BigInt(liveAuction.floorPrice);
    if (parsedBudget < floor) {
      return `Your budget is below the current ${dataType} floor price of ${formatStt(floor)} STT.`;
    }

    if (plan.error) {
      return plan.error.message;
    }

    return null;
  }, [budget, dataType, liveAuction, plan.error]);

  useEffect(() => {
    if (!plan.data || !liveAuction) return;
    addFeedEvent({
      id: `ai-planned-${liveAuction.id}-${urgency}-${budgetWei}-${plan.data.snapThresholdWei}`,
      kind: "ai-planned",
      title: "AI Planned Threshold",
      description: `${dataType} auction #${liveAuction.id} planned at ${formatStt(plan.data.snapThresholdWei)} STT using ${plan.data.model}.`,
      timestamp: Date.now(),
      auctionId: liveAuction.id,
      actorLabel: "Agora Planner",
    });
  }, [addFeedEvent, budgetWei, dataType, liveAuction, plan.data, urgency]);

  const handleDeploy = async () => {
    if (!liveAuction) return;

    setStep(3);
    const budgetWei = parseEther(budget || "0");

    try {
      const result = await spawn.mutateAsync({
        auctionId: liveAuction.id,
        budgetWei: budgetWei.toString(),
        urgency,
        targetDataType: dataType,
      });
      persistAgent({
        owner: address ?? "0x0000000000000000000000000000000000000000",
        address: result.consumerHandlerAddress,
        auctionId: liveAuction.id,
        dataType,
        model: result.model,
        urgency,
        thresholdWei: result.snapThresholdWei,
        baselineThresholdWei,
        budgetWei: result.budgetWei,
        rationale: result.rationale,
        deployedAt: Date.now(),
      });
      addFeedEvent({
        id: `consumer-deployed-${result.consumerHandlerAddress}`,
        kind: "consumer-deployed",
        title: "Consumer Agent Deployed",
        description: `${dataType} consumer deployed at ${shortenAddress(result.consumerHandlerAddress)} for auction #${liveAuction.id}.`,
        timestamp: Date.now(),
        txHash: result.transactionHash,
        auctionId: liveAuction.id,
        actorAddress: result.consumerHandlerAddress,
        actorLabel: "Consumer Agent",
      });
      setStep(4);
    } catch {
      setStep(2);
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-[2rem] border border-border bg-surface p-5 sm:p-8">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className={
                index <= step
                  ? "flex size-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-black"
                  : "flex size-8 items-center justify-center rounded-full border border-border text-sm text-muted"
              }
            >
              {index}
            </div>
            {index < 4 ? (
              <div className="h-px w-8 bg-border sm:w-14" />
            ) : null}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Deploy Your Consumer Agent
            </h1>
            <p className="mt-2 text-sm text-muted">
              Configure a consumer that watches live Agora auctions and deploys
              a `ConsumerHandler` contract through the Agora API wallet.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-3 text-sm text-muted">What data do you want?</p>
              <div className="grid grid-cols-3 gap-2">
                {dataTypes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDataType(option)}
                    className={
                      dataType === option
                        ? "rounded-2xl border border-white/15 bg-white px-4 py-4 text-sm font-medium text-black"
                        : "rounded-2xl border border-border bg-background px-4 py-4 text-sm text-foreground"
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm text-muted">Your budget (STT)</span>
              <input
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
              />
            </label>

            <div className="grid gap-2">
              <span className="text-sm text-muted">Urgency</span>
              <div className="grid grid-cols-3 gap-2">
                {urgencies.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setUrgency(option)}
                    className={
                      urgency === option
                        ? "rounded-2xl border border-white/15 bg-white px-4 py-4 text-sm font-medium text-black"
                        : "rounded-2xl border border-border bg-background px-4 py-4 text-sm text-foreground"
                    }
                  >
                    {urgencyLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">
                AI planner
              </p>
              {plan.data ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-foreground">
                    Agora recommends a threshold of{" "}
                    <span className="font-mono">
                      {formatStt(plan.data.snapThresholdWei)} STT
                    </span>{" "}
                    for this {dataType} auction.
                  </p>
                  <p className="text-xs leading-6 text-muted">
                    {plan.data.rationale}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">
                    Strategy: {strategyLabel(urgency)}
                  </p>
                  <p className="text-xs text-muted">
                    Model: {plan.data.model}
                  </p>
                  {baselineThresholdWei ? (
                    <p className="text-xs text-muted">
                      Rule baseline: {formatStt(baselineThresholdWei)} STT
                    </p>
                  ) : null}
                  {aiDeltaWei ? (
                    <p className="text-xs text-muted">
                      AI delta: {BigInt(aiDeltaWei) >= 0n ? "+" : ""}
                      {formatStt(aiDeltaWei)} STT
                    </p>
                  ) : null}
                </div>
              ) : plan.isLoading ? (
                <p className="mt-3 text-sm text-muted">
                  Calling the AI planner...
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  {recommendationMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!liveAuction}
            >
              Next
            </Button>
          </div>
        </motion.div>
      ) : null}

      {step === 2 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Review Deployment
            </h2>
            <p className="mt-2 text-sm text-muted">
              Review the contract funding and the current live Agora auction
              target before deploying.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-border bg-background p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">SOMI needed (subscription)</span>
              <span className="font-mono text-foreground">32</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">STT budget</span>
              <span className="font-mono text-foreground">{budget}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Target auction</span>
              <span className="font-mono text-foreground">
                {liveAuction ? `#${liveAuction.id}` : "Unavailable"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Current market price</span>
              <span className="font-mono text-foreground">
                {liveAuction ? `${formatStt(liveAuction.currentPrice)} STT` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">AI threshold</span>
              <span className="font-mono text-foreground">
                {plan.data ? `${formatStt(plan.data.snapThresholdWei)} STT` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Rule baseline</span>
              <span className="font-mono text-foreground">
                {baselineThresholdWei ? `${formatStt(baselineThresholdWei)} STT` : "—"}
              </span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-background p-5 text-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">
              Your agent will autonomously
            </p>
            <ul className="mt-3 space-y-2 text-foreground">
              <li>Watch live {dataType} auctions on Agora</li>
              <li>Snap when price reaches the AI-selected threshold</li>
              <li>Pay from the configured STT budget</li>
              <li>Receive verified price data on-chain</li>
            </ul>
            {plan.data?.rationale ? (
              <p className="mt-4 border-t border-border pt-4 leading-6 text-muted">
                {plan.data.rationale}
              </p>
            ) : null}
          </div>

          {spawn.error ? (
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted">
              {spawn.error.message}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={spawn.isPending || !liveAuction || !plan.data}
            >
              Deploy Agent
            </Button>
          </div>
        </motion.div>
      ) : null}

      {step === 3 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Deploying
          </h2>
          <div className="space-y-3 rounded-[1.5rem] border border-border bg-background p-5 text-sm">
            <div className="flex items-center justify-between">
              <span>Calling planner...</span>
              <span>{spawn.isPending ? "⟳" : plan.data ? "✓" : "…"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Deploying ConsumerHandler...</span>
              <span>{spawn.isPending ? "⟳" : "✓"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Funding contract...</span>
              <span>{spawn.isPending ? "⟳" : "✓"}</span>
            </div>
          </div>
        </motion.div>
      ) : null}

      {step === 4 && spawn.data ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your agent is live
            </h2>
            <p className="mt-2 text-sm text-muted">
              Consumer deployment completed through the Agora API.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-background p-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-sm text-foreground">
                {shortenAddress(spawn.data.consumerHandlerAddress)}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(spawn.data.consumerHandlerAddress)
                }
                className="rounded-full border border-border p-2 text-muted transition hover:text-foreground"
              >
                <Copy className="size-4" />
              </button>
              <a
                href={explorerAddressLink(spawn.data.consumerHandlerAddress)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border p-2 text-muted transition hover:text-foreground"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Watching</span>
                <span className="text-foreground">{dataType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Threshold</span>
                <span className="font-mono text-foreground">
                  {formatStt(spawn.data.snapThresholdWei)} STT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Budget</span>
                <span className="font-mono text-foreground">
                {formatStt(spawn.data.budgetWei)} STT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Planner model</span>
                <span className="text-foreground">{spawn.data.model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Strategy</span>
                <span className="text-foreground">{strategyLabel(urgency)}</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-muted">
              This contract is deployed by the Agora API wallet in the current
              backend implementation.
            </p>
            {spawn.data.rationale ? (
              <p className="mt-3 font-mono text-xs leading-6 text-muted">
                {spawn.data.rationale}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-white hover:text-black",
              )}
            >
              View in Dashboard
            </Link>
            <Link
              href="/feed"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-white hover:text-black",
              )}
            >
              Watch Live Feed
            </Link>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
