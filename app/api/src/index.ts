import { createApp } from "./app";
import { createBlockchainContext } from "./lib/blockchain";

async function main(): Promise<void> {
    const blockchain = createBlockchainContext();
    const app = createApp(blockchain);
    const PORT = blockchain.env.port;
    const HOST = "0.0.0.0";

    const server = app.listen(PORT, HOST, () => {
        console.log(`API listening on http://${HOST}:${PORT}`);
    });

    server.on("error", (error) => {
        console.error("API listen error", error);
        process.exit(1);
    });
}

void main().catch((error) => {
    console.error("Failed to start API", error);
    process.exit(1);
});
