import { Router } from "express";

import { asyncHandler } from "../lib/http";
import {
    requireAddress,
    requireNonEmptyString,
    requirePositiveId,
    requireUint8,
    requireUintString,
} from "../lib/validation";
import type {
    RegisterServiceInput,
    ServiceRegistryService,
} from "../services/service-registry-service";

export function createServicesRouter(
    serviceRegistryService: ServiceRegistryService,
): Router {
    const router = Router();

    router.get(
        "/",
        asyncHandler(async (_req, res) => {
            const services = await serviceRegistryService.listActiveServices();
            res.json({ services });
        }),
    );

    router.get(
        "/:id",
        asyncHandler(async (req, res) => {
            const serviceId = requirePositiveId(req.params.id, "id");
            const service = await serviceRegistryService.getServiceById(
                serviceId,
            );
            res.json({ service });
        }),
    );

    router.get(
        "/:id/requests",
        asyncHandler(async (req, res) => {
            const serviceId = requirePositiveId(req.params.id, "id");
            const requests = await serviceRegistryService.getServiceRequests(
                serviceId,
            );
            res.json({ requests });
        }),
    );

    router.post(
        "/register",
        asyncHandler(async (req, res) => {
            const body = req.body as Record<string, unknown>;

            const input: RegisterServiceInput = {
                dataType: requireNonEmptyString(body.dataType, "dataType"),
                apiUrl: requireNonEmptyString(body.apiUrl, "apiUrl"),
                jsonSelector: requireNonEmptyString(
                    body.jsonSelector,
                    "jsonSelector",
                ),
                decimals: requireUint8(body.decimals, "decimals"),
                pricePerRequest: requireUintString(
                    body.pricePerRequest,
                    "pricePerRequest",
                ),
                timeoutBlocks: requireUintString(
                    body.timeoutBlocks,
                    "timeoutBlocks",
                ),
            };

            const result = await serviceRegistryService.registerService(input);
            res.status(201).json(result);
        }),
    );

    router.post(
        "/:id/request",
        asyncHandler(async (req, res) => {
            const serviceId = requirePositiveId(req.params.id, "id");
            const body = req.body as Record<string, unknown>;
            const rawConsumerAddress = body.consumerAddress;
            const consumerAddress =
                rawConsumerAddress === undefined
                    ? undefined
                    : requireAddress(rawConsumerAddress, "consumerAddress");

            const result = await serviceRegistryService.requestData(
                serviceId,
                consumerAddress,
            );
            res.status(201).json(result);
        }),
    );

    router.post(
        "/:id/pause",
        asyncHandler(async (req, res) => {
            const serviceId = requirePositiveId(req.params.id, "id");
            const result = await serviceRegistryService.pauseService(serviceId);
            res.status(200).json(result);
        }),
    );

    router.post(
        "/requests/:requestId/refund",
        asyncHandler(async (req, res) => {
            const requestId = requirePositiveId(
                req.params.requestId,
                "requestId",
            );
            const result = await serviceRegistryService.claimRefund(requestId);
            res.status(200).json(result);
        }),
    );

    router.post(
        "/:id/resume",
        asyncHandler(async (req, res) => {
            const serviceId = requirePositiveId(req.params.id, "id");
            const result = await serviceRegistryService.resumeService(serviceId);
            res.status(200).json(result);
        }),
    );

    return router;
}
