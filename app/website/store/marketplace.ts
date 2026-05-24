"use client";

import { create } from "zustand";

import type { ApiAuction, ApiService, ApiServiceRequest } from "@/lib/api";

export type AuctionStatus = "LIVE" | "SNAPPED" | "EXPIRED";
export type ServiceStatus = "ACTIVE" | "PAUSED" | "DEACTIVATED";

export interface Auction extends ApiAuction {
  statusKey: AuctionStatus;
  lastUpdatedAt?: number;
}

export interface Service extends ApiService {
  statusKey: ServiceStatus;
  lastUpdatedAt?: number;
}

export interface ServiceRequest extends ApiServiceRequest {
  localRequestedAt?: number;
  fulfilledAt?: number;
}

export interface FeedEvent {
  id: string;
  kind:
    | "ai-planned"
    | "consumer-deployed"
    | "auction-started"
    | "price-tick"
    | "auction-snapped"
    | "auction-expired"
    | "data-delivered"
    | "payment-refunded"
    | "service-registered"
    | "service-requested"
    | "service-delivered"
    | "service-refunded"
    | "service-status-changed";
  title: string;
  description: string;
  timestamp: number;
  txHash?: string;
  auctionId?: string;
  serviceId?: string;
  requestId?: string;
  actorAddress?: string;
  actorLabel?: string;
}

export interface MarketplaceStats {
  totalAuctions: number;
  totalVolumeWei: bigint;
  activeAgents: number;
  avgDeliverySeconds: number;
  aiPlansGenerated: number;
}

interface MarketplaceStore {
  auctions: Auction[];
  services: Service[];
  serviceRequests: ServiceRequest[];
  feed: FeedEvent[];
  stats: MarketplaceStats;
  setAuctions: (auctions: ApiAuction[]) => void;
  setServices: (services: ApiService[]) => void;
  updateAuctionPrice: (auctionId: number, newPrice: bigint) => void;
  markAuctionSnapped: (
    auctionId: number,
    winner: string,
    price: bigint,
  ) => void;
  markAuctionExpired: (auctionId: number) => void;
  addAuction: (auction: ApiAuction) => void;
  addService: (service: ApiService) => void;
  addServiceRequest: (
    request: ApiServiceRequest & {
      localRequestedAt?: number;
      fulfilledAt?: number;
    },
  ) => void;
  updateServiceRequest: (
    requestId: string,
    patch: Partial<ServiceRequest>,
  ) => void;
  updateServiceStatus: (
    serviceId: number,
    statusLabel: ApiService["statusLabel"],
  ) => void;
  addFeedEvent: (event: FeedEvent) => void;
  setStats: (stats: MarketplaceStats) => void;
}

function toStatusKey(statusLabel: ApiAuction["statusLabel"]): AuctionStatus {
  if (statusLabel === "Snapped") return "SNAPPED";
  if (statusLabel === "Expired") return "EXPIRED";
  return "LIVE";
}

function withDerivedStatus(auction: ApiAuction): Auction {
  return {
    ...auction,
    statusKey: toStatusKey(auction.statusLabel),
  };
}

function toServiceStatusKey(
  statusLabel: ApiService["statusLabel"],
): ServiceStatus {
  if (statusLabel === "Paused") return "PAUSED";
  if (statusLabel === "Deactivated") return "DEACTIVATED";
  return "ACTIVE";
}

function withDerivedServiceStatus(service: ApiService): Service {
  return {
    ...service,
    statusKey: toServiceStatusKey(service.statusLabel),
  };
}

export const useMarketplaceStore = create<MarketplaceStore>((set) => ({
  auctions: [],
  services: [],
  serviceRequests: [],
  feed: [],
  stats: {
    totalAuctions: 0,
    totalVolumeWei: BigInt(0),
    activeAgents: 0,
    avgDeliverySeconds: 0,
    aiPlansGenerated: 0,
  },
  setAuctions: (auctions) =>
    set(() => ({
      auctions: auctions.map(withDerivedStatus),
    })),
  setServices: (services) =>
    set(() => ({
      services: services.map(withDerivedServiceStatus),
    })),
  updateAuctionPrice: (auctionId, newPrice) =>
    set((state) => ({
      auctions: state.auctions.map((auction) =>
        Number(auction.id) === auctionId
          ? {
              ...auction,
              currentPrice: newPrice.toString(),
              lastUpdatedAt: Date.now(),
            }
          : auction,
      ),
    })),
  markAuctionSnapped: (auctionId, winner, price) =>
    set((state) => ({
      auctions: state.auctions.map((auction) =>
        Number(auction.id) === auctionId
          ? {
              ...auction,
              winner,
              currentPrice: price.toString(),
              statusLabel: "Snapped",
              statusKey: "SNAPPED",
              lastUpdatedAt: Date.now(),
            }
          : auction,
      ),
    })),
  markAuctionExpired: (auctionId) =>
    set((state) => ({
      auctions: state.auctions.map((auction) =>
        Number(auction.id) === auctionId
          ? {
              ...auction,
              statusLabel: "Expired",
              statusKey: "EXPIRED",
              lastUpdatedAt: Date.now(),
            }
          : auction,
      ),
    })),
  addAuction: (auction) =>
    set((state) => ({
      auctions: [withDerivedStatus(auction), ...state.auctions],
    })),
  addService: (service) =>
    set((state) => {
      const next = withDerivedServiceStatus(service);
      const existingIndex = state.services.findIndex(
        (current) => current.id === next.id,
      );
      if (existingIndex === -1) {
        return { services: [next, ...state.services] };
      }

      const services = [...state.services];
      services[existingIndex] = {
        ...services[existingIndex],
        ...next,
        lastUpdatedAt: Date.now(),
      };
      return { services };
    }),
  addServiceRequest: (request) =>
    set((state) => {
      const existingIndex = state.serviceRequests.findIndex(
        (current) => current.id === request.id,
      );
      const nextRequest: ServiceRequest = {
        ...request,
        localRequestedAt:
          request.localRequestedAt ??
          state.serviceRequests[existingIndex]?.localRequestedAt ??
          Date.now(),
        fulfilledAt:
          request.fulfilledAt ??
          state.serviceRequests[existingIndex]?.fulfilledAt,
      };

      if (existingIndex === -1) {
        return { serviceRequests: [nextRequest, ...state.serviceRequests] };
      }

      const serviceRequests = [...state.serviceRequests];
      serviceRequests[existingIndex] = {
        ...serviceRequests[existingIndex],
        ...nextRequest,
      };
      return { serviceRequests };
    }),
  updateServiceRequest: (requestId, patch) =>
    set((state) => ({
      serviceRequests: state.serviceRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              ...patch,
            }
          : request,
      ),
    })),
  updateServiceStatus: (serviceId, statusLabel) =>
    set((state) => ({
      services: state.services.map((service) =>
        Number(service.id) === serviceId
          ? {
              ...service,
              statusLabel,
              statusKey: toServiceStatusKey(statusLabel),
              lastUpdatedAt: Date.now(),
            }
          : service,
      ),
    })),
  addFeedEvent: (event) =>
    set((state) => ({
      feed: [event, ...state.feed].slice(0, 200),
    })),
  setStats: (stats) => set(() => ({ stats })),
}));
