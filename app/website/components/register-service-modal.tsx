"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMarketplaceStore } from "@/store/marketplace";

const defaults = {
  "BTC/USD": {
    apiUrl:
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    jsonSelector: "bitcoin.usd",
  },
  "ETH/USD": {
    apiUrl:
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    jsonSelector: "ethereum.usd",
  },
  "SOL/USD": {
    apiUrl:
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    jsonSelector: "solana.usd",
  },
} as const;

type DataType = keyof typeof defaults;

export function RegisterServiceModal() {
  const [open, setOpen] = useState(false);
  const [dataType, setDataType] = useState<DataType>("BTC/USD");
  const [apiUrl, setApiUrl] = useState<string>(defaults["BTC/USD"].apiUrl);
  const [jsonSelector, setJsonSelector] = useState<string>(
    defaults["BTC/USD"].jsonSelector,
  );
  const [decimals, setDecimals] = useState("8");
  const [pricePerRequest, setPricePerRequest] = useState("2");
  const [timeoutBlocks, setTimeoutBlocks] = useState("1000");
  const queryClient = useQueryClient();
  const addFeedEvent = useMarketplaceStore((state) => state.addFeedEvent);
  const registerService = useMutation({
    mutationFn: async () =>
      api.registerService({
        dataType,
        apiUrl,
        jsonSelector,
        decimals: Number(decimals),
        pricePerRequest: `${BigInt(Math.round(Number(pricePerRequest) * 10_000)) * 10n ** 14n}`,
        timeoutBlocks,
      }),
    onSuccess: async (result) => {
      addFeedEvent({
        id: `${result.transactionHash}-register-service-local`,
        kind: "service-registered",
        title: "ServiceRegistered",
        description: `${dataType} service #${result.serviceId} submitted on-chain`,
        timestamp: Date.now(),
        txHash: result.transactionHash,
        serviceId: result.serviceId,
      });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
    },
  });

  const handleDataType = (nextType: DataType) => {
    setDataType(nextType);
    setApiUrl(defaults[nextType].apiUrl);
    setJsonSelector(defaults[nextType].jsonSelector);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Register Service</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register Service</DialogTitle>
          <DialogDescription>
            Persist a fixed-price data service that can fulfill unlimited
            requests without relisting.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm text-muted">Data Type</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(defaults) as DataType[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleDataType(option)}
                  className={
                    dataType === option
                      ? "rounded-2xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-black"
                      : "rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm text-muted">API URL</span>
            <input
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
            />
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm text-muted">JSON Selector</span>
            <input
              value={jsonSelector}
              onChange={(event) => setJsonSelector(event.target.value)}
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-muted">Decimals</span>
            <input
              value={decimals}
              onChange={(event) => setDecimals(event.target.value)}
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-muted">Price Per Request (STT)</span>
            <input
              value={pricePerRequest}
              onChange={(event) => setPricePerRequest(event.target.value)}
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
            />
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm text-muted">Timeout (blocks)</span>
            <input
              value={timeoutBlocks}
              onChange={(event) => setTimeoutBlocks(event.target.value)}
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => registerService.mutate()}
            disabled={registerService.isPending}
          >
            {registerService.isPending ? "Registering..." : "Register Service"}
          </Button>
        </div>
        {registerService.error ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted">
            {registerService.error.message}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
