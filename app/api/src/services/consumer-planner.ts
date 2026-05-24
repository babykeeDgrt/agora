import type { AppEnv } from "../config/env";
import { HuggingFaceAdapter } from "../lib/huggingface";
import { HttpError } from "../lib/http";
import type { AuctionView } from "./auction-service";
import type { ConsumerUrgency } from "./consumer-service";

export interface ConsumerPlan {
    snapThresholdWei: bigint;
    rationale: string;
    model: string;
}

function max(a: bigint, b: bigint): bigint {
    return a > b ? a : b;
}

function min(a: bigint, b: bigint): bigint {
    return a < b ? a : b;
}

function buildPrompt(
    auction: AuctionView,
    budgetWei: bigint,
    urgency: ConsumerUrgency,
): string {
    return [
        "Choose a single snap threshold in wei for a Dutch auction consumer.",
        "Return valid JSON only.",
        "Your first character must be { and your last character must be }.",
        'Schema: {"snapThresholdWei":"<unsigned integer wei>","rationale":"<short explanation>"}',
        `auctionId=${auction.id}`,
        `provider=${auction.provider}`,
        `dataType=${auction.dataType}`,
        `startPriceWei=${auction.startPrice}`,
        `currentPriceWei=${auction.currentPrice}`,
        `floorPriceWei=${auction.floorPrice}`,
        `budgetWei=${budgetWei.toString()}`,
        `urgency=${urgency}`,
        "Decision objective: choose the latest reasonable price for low urgency, a balanced price for medium urgency, and the earliest safe price for high urgency.",
        "Hard constraints: snapThresholdWei must be between floorPriceWei and min(currentPriceWei, budgetWei), inclusive.",
    ].join("\n");
}

function extractPlan(raw: string): { snapThresholdWei: bigint; rationale: string } {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`LLM returned non-JSON planner output: ${raw}`);
    }

    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
        snapThresholdWei?: string;
        rationale?: string;
    };

    if (!parsed.snapThresholdWei || !/^\d+$/.test(parsed.snapThresholdWei)) {
        throw new Error(`LLM returned invalid snapThresholdWei: ${raw}`);
    }

    return {
        snapThresholdWei: BigInt(parsed.snapThresholdWei),
        rationale: parsed.rationale?.trim() || "No rationale provided",
    };
}

export class ConsumerPlannerService {
    private readonly llm: HuggingFaceAdapter;
    private readonly model: string;

    constructor(env: AppEnv) {
        if (!env.huggingFaceApiKey) {
            throw new Error("Missing required environment variable: HUGGINGFACE_API_KEY");
        }

        this.model = env.huggingFaceModel ?? "Qwen/Qwen3-32B";
        this.llm = new HuggingFaceAdapter({
            apiKey: env.huggingFaceApiKey,
            defaultModel: this.model,
        });
    }

    async plan(
        auction: AuctionView,
        budgetWei: bigint,
        urgency: ConsumerUrgency,
    ): Promise<ConsumerPlan> {
        const floorPrice = BigInt(auction.floorPrice);
        const currentPrice = BigInt(auction.currentPrice);

        if (budgetWei < floorPrice) {
            throw new HttpError(400, "budgetWei is below the auction floor price");
        }

        const response = await this.llm.chat(
            [
                {
                    role: "system",
                    content:
                        "You are an auction decision agent. Do not reveal reasoning. Do not emit <think> tags. Output only a single JSON object and nothing else.",
                },
                {
                    role: "user",
                    content: buildPrompt(auction, budgetWei, urgency),
                },
            ],
            {
                temperature: 0,
                maxTokens: 120,
            },
        );

        const parsed = extractPlan(response.content);
        const upperBound = min(currentPrice, budgetWei);
        const snapThresholdWei = min(
            upperBound,
            max(floorPrice, parsed.snapThresholdWei),
        );

        return {
            snapThresholdWei,
            rationale: parsed.rationale,
            model: response.model ?? this.model,
        };
    }
}
