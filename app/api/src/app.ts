import cors from "cors";
import express, {
    type Express,
    type NextFunction,
    type Request,
    type Response,
} from "express";
import rateLimit from "express-rate-limit";

import type { BlockchainContext } from "./lib/blockchain";
import { HttpError, sendError } from "./lib/http";
import { createAuctionRouter } from "./routes/auctions";
import { createConsumerRouter } from "./routes/consumer";
import { createHealthRouter } from "./routes/health";
import { createProviderRouter } from "./routes/provider";
import { AuctionService } from "./services/auction-service";
import { ConsumerService } from "./services/consumer-service";
import { createServicesRouter } from "./routes/services";
import { ServiceRegistryService } from "./services/service-registry-service";

function isAllowedDevOrigin(origin: string): boolean {
    if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://[::1]:")
    ) {
        return true;
    }

    return /^http:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/.test(
        origin,
    );
}

export function createApp(blockchain: BlockchainContext): Express {
    const app = express();
    const auctionService = new AuctionService(blockchain);
    const serviceRegistryService = new ServiceRegistryService(blockchain);
    const consumerService = new ConsumerService(blockchain, auctionService);
    const explicitOrigins = blockchain.env.webUrl
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin) {
                    callback(null, true);
                    return;
                }

                if (
                    explicitOrigins.includes(origin) ||
                    isAllowedDevOrigin(origin)
                ) {
                    callback(null, true);
                    return;
                }

                callback(new Error(`Origin not allowed by CORS: ${origin}`));
            },
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type"],
        }),
    );
    app.use(express.json({ limit: "1mb" }));
    app.use(
        rateLimit({
            windowMs: 60_000,
            limit: 120,
            standardHeaders: true,
            legacyHeaders: false,
        }),
    );

    app.use(createHealthRouter(blockchain));
    app.use(createAuctionRouter(auctionService));
    app.use("/services", createServicesRouter(serviceRegistryService));
    app.use(createProviderRouter(auctionService));
    app.use(createConsumerRouter(consumerService));

    app.use((req, res) => {
        sendError(res, 404, `Route not found: ${req.method} ${req.path}`);
    });

    app.use(
        (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
            if (error instanceof HttpError) {
                sendError(res, error.statusCode, error.message);
                return;
            }

            if (error instanceof Error) {
                sendError(res, 500, error.message);
                return;
            }

            sendError(res, 500, "Unknown server error");
        },
    );

    return app;
}
