import { Router } from "express";

import { asyncHandler } from "../lib/http";
import type { BlockchainContext } from "../lib/blockchain";

export function createHealthRouter(blockchain: BlockchainContext): Router {
    const router = Router();

    router.get("/", (_req, res) => {
        res.json({
            ok: true,
            service: "agora-api",
        });
    });

    router.get(
        "/health",
        asyncHandler(async (_req, res) => {
            const blockNumber = await blockchain.provider.getBlockNumber();

            res.json({
                ok: true,
                blockNumber,
                walletAddress: blockchain.wallet.address,
                dutchAuctionAddress: blockchain.env.dutchAuctionAddress,
                dataProviderAddress: blockchain.env.dataProviderAddress,
            });
        }),
    );

    return router;
}
