"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { useMarketplaceStore } from "@/store/marketplace";

export function useServices() {
  const setServices = useMarketplaceStore((state) => state.setServices);

  const query = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const response = await api.services();
      return response.services;
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (query.data) {
      setServices(query.data);
    }
  }, [query.data, setServices]);

  return query;
}
