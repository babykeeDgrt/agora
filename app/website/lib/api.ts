export interface ApiAuction {
  id: string;
  provider: string;
  dataType: string;
  apiUrl: string;
  jsonSelector: string;
  decimals: number;
  startPrice: string;
  floorPrice: string;
  currentPrice: string;
  priceStep: string;
  startBlock: string;
  timeoutBlocks: string;
  status: number;
  statusLabel: "Active" | "Snapped" | "Expired";
  winner: string;
  escrowRef: string;
}

export interface ApiService {
  id: string;
  provider: string;
  dataType: string;
  apiUrl: string;
  jsonSelector: string;
  decimals: number;
  pricePerRequest: string;
  timeoutBlocks: string;
  status: number;
  statusLabel: "Active" | "Paused" | "Deactivated";
  totalRequests: string;
  totalDelivered: string;
  totalFailed: string;
  registeredAt: string;
}

export interface ApiServiceRequest {
  id: string;
  serviceId: string;
  consumer: string;
  payment: string;
  requestedAt: string;
  timeoutBlocks: string;
  status: number;
  statusLabel: "Pending" | "Fulfilled" | "Refunded" | "Failed";
  deliveredPrice: string;
  agentRequestId: string;
}

export interface HealthResponse {
  ok: boolean;
  blockNumber: number;
  walletAddress: string;
  dutchAuctionAddress: string;
  dataProviderAddress: string;
}

export interface ConsumerPlanResponse {
  auction: ApiAuction;
  snapThresholdWei: string;
  budgetWei: string;
  rationale: string;
  model: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  const hasBody = init?.body !== undefined && init?.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {}
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  auctions: () => request<{ auctions: ApiAuction[] }>("/auctions"),
  auction: (id: string | number) =>
    request<{ auction: ApiAuction }>(`/auctions/${id}`),
  services: () => request<{ services: ApiService[] }>("/services"),
  service: (id: string | number) =>
    request<{ service: ApiService }>(`/services/${id}`),
  serviceRequests: (id: string | number) =>
    request<{ requests: ApiServiceRequest[] }>(`/services/${id}/requests`),
  planConsumer: <TPayload extends object>(payload: TPayload) =>
    request<ConsumerPlanResponse>("/consumer/plan", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createAuction: <TPayload extends object>(payload: TPayload) =>
    request<{
      auctionId: string;
      transactionHash: string;
      blockNumber: number;
    }>("/provider/auction", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  registerService: <TPayload extends object>(payload: TPayload) =>
    request<{
      serviceId: string;
      transactionHash: string;
      blockNumber: number;
    }>("/services/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  requestServiceData: <TPayload extends object>(id: string | number, payload?: TPayload) =>
    request<{
      requestId: string;
      serviceId: string;
      consumer: string;
      payment: string;
      transactionHash: string;
      blockNumber: number;
    }>(`/services/${id}/request`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  pauseService: (id: string | number) =>
    request<{
      serviceId: string;
      status: "Paused";
      transactionHash: string;
      blockNumber: number;
    }>(`/services/${id}/pause`, {
      method: "POST",
    }),
  resumeService: (id: string | number) =>
    request<{
      serviceId: string;
      status: "Active";
      transactionHash: string;
      blockNumber: number;
    }>(`/services/${id}/resume`, {
      method: "POST",
    }),
  refundServiceRequest: (requestId: string | number) =>
    request<{
      requestId: string;
      status: "Refunded";
      transactionHash: string;
      blockNumber: number;
    }>(`/services/requests/${requestId}/refund`, {
      method: "POST",
    }),
  spawnConsumer: <TPayload extends object>(payload: TPayload) =>
    request<{
      consumerHandlerAddress: string;
      snapThresholdWei: string;
      budgetWei: string;
      rationale: string;
      model: string;
      transactionHash: string;
      blockNumber: number;
    }>("/consumer/spawn", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
