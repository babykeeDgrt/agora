FROM node:22-slim

# Install system dependencies needed for Foundry installation and builds
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry (forge, cast, anvil) into ~/.foundry/bin
RUN curl -L https://foundry.paradigm.xyz | bash \
    && /root/.foundry/bin/foundryup

ENV PATH="/root/.foundry/bin:${PATH}"
ENV FORGE_BIN="/root/.foundry/bin/forge"

# Copy the entire repo so contracts and API source are both available
WORKDIR /root/repo
COPY . .

# Install contracts npm dependencies (provides @somnia-chain/reactivity-contracts remapping)
RUN cd contracts && npm install

# Compile Solidity contracts — generates artifacts in contracts/out/
RUN cd contracts && forge build

# Install API dependencies
RUN cd app/api && npm install -g pnpm && pnpm install

# Build the TypeScript API
RUN cd app/api && pnpm build

WORKDIR /root/repo/app/api

EXPOSE 3000

CMD ["node", "dist/index.js"]
