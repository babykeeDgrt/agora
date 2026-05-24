"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface PlanPayload {
  auctionId?: string;
  budgetWei?: string;
  urgency: "low" | "medium" | "high";
  targetDataType?: string;
}

export function useConsumerPlan(payload: PlanPayload) {
  return useQuery({
    queryKey: ["consumer-plan", payload],
    queryFn: async () =>
      api.planConsumer({
        auctionId: payload.auctionId,
        budgetWei: payload.budgetWei,
        urgency: payload.urgency,
        targetDataType: payload.targetDataType,
      }),
    enabled: Boolean(payload.auctionId && payload.budgetWei),
    retry: 0,
    staleTime: 10_000,
  });
}
