"use client";

import { motion } from "framer-motion";
import { Copy, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  explorerAddressLink,
  formatScalarValue,
  formatStt,
  shortenAddress,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMarketplaceStore, type Service } from "@/store/marketplace";

function statusClass(statusKey: Service["statusKey"]) {
  if (statusKey === "ACTIVE") return "text-foreground";
  if (statusKey === "PAUSED") return "text-muted";
  return "text-dim";
}

export function ServiceCard({ service }: { service: Service }) {
  const queryClient = useQueryClient();
  const requests = useMarketplaceStore((state) => state.serviceRequests);
  const addServiceRequest = useMarketplaceStore(
    (state) => state.addServiceRequest,
  );
  const updateServiceRequest = useMarketplaceStore(
    (state) => state.updateServiceRequest,
  );
  const requestMutation = useMutation({
    mutationFn: async () => api.requestServiceData(service.id),
    onSuccess: async (result) => {
      addServiceRequest({
        id: result.requestId,
        serviceId: result.serviceId,
        consumer: result.consumer,
        payment: result.payment,
        requestedAt: result.blockNumber.toString(),
        timeoutBlocks: service.timeoutBlocks,
        status: 0,
        statusLabel: "Pending",
        deliveredPrice: "0",
        agentRequestId: "0",
        localRequestedAt: Date.now(),
      });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
  const refundMutation = useMutation({
    mutationFn: async (requestId: string) => api.refundServiceRequest(requestId),
    onSuccess: async (result) => {
      updateServiceRequest(result.requestId, {
        status: 2,
        statusLabel: "Refunded",
      });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const serviceRequests = requests.filter(
    (request) => request.serviceId === service.id,
  );
  const latestRequest = serviceRequests[0];
  const deliveryDurations = serviceRequests
    .filter(
      (request) =>
        request.statusLabel === "Fulfilled" &&
        request.localRequestedAt !== undefined &&
        request.fulfilledAt !== undefined,
    )
    .map((request) =>
      Math.max(
        0,
        Math.round(
          ((request.fulfilledAt ?? 0) - (request.localRequestedAt ?? 0)) / 1000,
        ),
      ),
    );
  const avgDeliverySeconds =
    deliveryDurations.length === 0
      ? null
      : Math.round(
          deliveryDurations.reduce((sum, value) => sum + value, 0) /
            deliveryDurations.length,
        );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex h-full flex-col gap-5 rounded-[2rem] border border-border bg-background p-5 sm:p-6",
        service.statusKey !== "ACTIVE" && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-lg font-semibold tracking-tight sm:text-xl">
            {service.dataType}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span>Provider {shortenAddress(service.provider)}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(service.provider)}
              className="rounded-full border border-border p-1 text-muted transition hover:text-foreground"
            >
              <Copy className="size-3" />
            </button>
            <a
              href={explorerAddressLink(service.provider)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border p-1 text-muted transition hover:text-foreground"
            >
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <span
          className={cn(
            "text-xs uppercase tracking-[0.28em]",
            statusClass(service.statusKey),
          )}
        >
          {service.statusKey}
        </span>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-surface p-5">
        <div className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
          {formatStt(service.pricePerRequest)}
          <span className="ml-2 text-sm text-muted sm:text-base">STT</span>
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted">
          fixed price per request
        </p>
      </div>

      <div className="grid gap-3 text-sm text-muted">
        <div className="flex items-center justify-between gap-4">
          <span>Total served</span>
          <span className="font-mono text-foreground">
            {service.totalDelivered} requests
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Avg delivery</span>
          <span className="font-mono text-foreground">
            {avgDeliverySeconds === null ? "--" : `${avgDeliverySeconds}s`}
          </span>
        </div>
        {latestRequest?.statusLabel === "Fulfilled" ? (
          <div className="flex items-center justify-between gap-4">
            <span>Last value</span>
            <span className="font-mono text-foreground">
              {formatScalarValue(latestRequest.deliveredPrice, service.decimals)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-3">
        {latestRequest?.statusLabel === "Pending" ? (
          <p className="text-xs text-muted">
            Latest request #{latestRequest.id} is pending fulfillment
          </p>
        ) : latestRequest?.statusLabel === "Refunded" ? (
          <p className="text-xs text-muted">
            Latest request #{latestRequest.id} was refunded
          </p>
        ) : latestRequest?.statusLabel === "Fulfilled" ? (
          <p className="text-xs text-muted">
            Latest request #{latestRequest.id} delivered successfully
          </p>
        ) : null}
        <Button
          className="w-full"
          onClick={() => requestMutation.mutate()}
          disabled={
            service.statusKey !== "ACTIVE" || requestMutation.isPending
          }
        >
          {requestMutation.isPending
            ? "Requesting..."
            : `Request Data — ${formatStt(service.pricePerRequest)} STT`}
        </Button>
        {latestRequest?.statusLabel === "Pending" ? (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => refundMutation.mutate(latestRequest.id)}
            disabled={refundMutation.isPending}
          >
            {refundMutation.isPending ? "Refunding..." : "Claim Refund"}
          </Button>
        ) : null}
        {requestMutation.error ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {requestMutation.error.message}
          </div>
        ) : null}
        {refundMutation.error ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {refundMutation.error.message}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
