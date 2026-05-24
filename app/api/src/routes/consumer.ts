import { Router } from "express";

import { asyncHandler } from "../lib/http";
import {
    requireNonEmptyString,
    requirePositiveId,
    requireUrgency,
    requireUintString,
} from "../lib/validation";
import type {
    ConsumerService,
    SpawnConsumerInput,
} from "../services/consumer-service";

export function createConsumerRouter(consumerService: ConsumerService): Router {
    const router = Router();

    router.post(
        "/consumer/plan",
        asyncHandler(async (req, res) => {
            const body = req.body as Record<string, unknown>;
            const rawTargetDataType = body.targetDataType;

            const input: SpawnConsumerInput = {
                auctionId: requirePositiveId(body.auctionId, "auctionId"),
                budgetWei: requireUintString(body.budgetWei, "budgetWei"),
                urgency: requireUrgency(body.urgency),
            };

            if (rawTargetDataType !== undefined) {
                input.targetDataType = requireNonEmptyString(
                    rawTargetDataType,
                    "targetDataType",
                );
            }

            const result = await consumerService.planConsumer(input);
            res.status(200).json(result);
        }),
    );

    router.post(
        "/consumer/spawn",
        asyncHandler(async (req, res) => {
            const body = req.body as Record<string, unknown>;
            const rawTargetDataType = body.targetDataType;

            const input: SpawnConsumerInput = {
                auctionId: requirePositiveId(body.auctionId, "auctionId"),
                budgetWei: requireUintString(body.budgetWei, "budgetWei"),
                urgency: requireUrgency(body.urgency),
            };

            if (rawTargetDataType !== undefined) {
                input.targetDataType = requireNonEmptyString(
                    rawTargetDataType,
                    "targetDataType",
                );
            }

            const result = await consumerService.spawnConsumer(input);
            res.status(201).json(result);
        }),
    );

    return router;
}
