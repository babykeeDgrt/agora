-include .env
-include deployments/testnet.env

LOCAL_RPC_URL ?= http://127.0.0.1:8545
LOCAL_PRIVATE_KEY ?= 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
AUCTION_CLOCK_GAS_LIMIT ?= 5000000
AUCTION_CLOCK_DEPLOY_VALUE ?= 33000000000000000000

SOMNIA_AGENT_PLATFORM ?= 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
JSON_API_AGENT_ID ?= 13174292974160097713
SOMNIA_TESTNET_VERIFIER_URL ?= https://shannon-explorer.somnia.network/api/

CONSUMER_SNAP_THRESHOLD ?= 3000000000000000000
CONSUMER_TARGET_DATA_TYPE ?= ETH/USD
CONSUMER_HANDLER_GAS_LIMIT ?= 2000000
CONSUMER_HANDLER_DEPLOY_VALUE ?= 42000000000000000000

REACTIVITY_PRECOMPILE := 0x0000000000000000000000000000000000000100
REACTIVITY_PRECOMPILE_RUNTIME := $(shell forge inspect src/mocks/MockReactivityPrecompile.sol:MockReactivityPrecompile deployedBytecode 2>/dev/null)
LOCAL_AGENT_PLATFORM_RUNTIME := $(shell forge inspect src/mocks/MockAgentPlatform.sol:MockAgentPlatform deployedBytecode 2>/dev/null)
STORAGE_SLOT_ZERO := 0x0000000000000000000000000000000000000000000000000000000000000000
STORAGE_VALUE_ONE := 0x0000000000000000000000000000000000000000000000000000000000000001
STORAGE_SLOT_ONE := 0x0000000000000000000000000000000000000000000000000000000000000001
LOCAL_REQUEST_ID_ONE := 0x0000000000000000000000000000000000000000000000000000000000000001
LOCAL_REQUEST_DEPOSIT := 0x000000000000000000000000000000000000000000000000006a94d74f430000

.PHONY: build coverage test compile fmt anvil bootstrap-local-reactivity \
	deploy-local-core deploy-local-consumer deploy-testnet-core deploy-testnet-consumer \
	verify-testnet-escrow verify-testnet-auction-clock verify-testnet-dutch-auction \
	verify-testnet-data-provider verify-testnet-service-registry verify-testnet-consumer-handler verify-testnet-core \
	verify-testnet-all

build:
	forge build

coverage:
	forge coverage

test:
	forge test

compile:
	forge compile

fmt:
	forge fmt

anvil:
	anvil

bootstrap-local-reactivity: build
	cast rpc --rpc-url $(LOCAL_RPC_URL) anvil_setCode $(REACTIVITY_PRECOMPILE) $(REACTIVITY_PRECOMPILE_RUNTIME)
	cast rpc --rpc-url $(LOCAL_RPC_URL) anvil_setStorageAt $(REACTIVITY_PRECOMPILE) $(STORAGE_SLOT_ZERO) $(STORAGE_VALUE_ONE)
	cast rpc --rpc-url $(LOCAL_RPC_URL) anvil_setCode $(SOMNIA_AGENT_PLATFORM) $(LOCAL_AGENT_PLATFORM_RUNTIME)
	cast rpc --rpc-url $(LOCAL_RPC_URL) anvil_setStorageAt $(SOMNIA_AGENT_PLATFORM) $(STORAGE_SLOT_ZERO) $(LOCAL_REQUEST_ID_ONE)
	cast rpc --rpc-url $(LOCAL_RPC_URL) anvil_setStorageAt $(SOMNIA_AGENT_PLATFORM) $(STORAGE_SLOT_ONE) $(LOCAL_REQUEST_DEPOSIT)

deploy-local-core: bootstrap-local-reactivity
	LOCAL_PRIVATE_KEY=$(LOCAL_PRIVATE_KEY) \
	AUCTION_CLOCK_GAS_LIMIT=$(AUCTION_CLOCK_GAS_LIMIT) \
	forge script script/DeployLocal.s.sol:DeployLocalScript \
		--rpc-url $(LOCAL_RPC_URL) \
		--private-key $(LOCAL_PRIVATE_KEY) \
		--broadcast

deploy-local-consumer: bootstrap-local-reactivity
	DUTCH_AUCTION_ADDRESS=$(DUTCH_AUCTION_ADDRESS) \
	DATA_PROVIDER_ADDRESS=$(DATA_PROVIDER_ADDRESS) \
	CONSUMER_SNAP_THRESHOLD=$(CONSUMER_SNAP_THRESHOLD) \
	CONSUMER_TARGET_DATA_TYPE="$(CONSUMER_TARGET_DATA_TYPE)" \
	CONSUMER_HANDLER_GAS_LIMIT=$(CONSUMER_HANDLER_GAS_LIMIT) \
	CONSUMER_HANDLER_DEPLOY_VALUE=$(CONSUMER_HANDLER_DEPLOY_VALUE) \
	forge script script/ConsumerHandler.s.sol:ConsumerHandlerScript \
		--rpc-url $(LOCAL_RPC_URL) \
		--private-key $(LOCAL_PRIVATE_KEY) \
		--broadcast

deploy-testnet-core: build
	PRIVATE_KEY=$(PRIVATE_KEY) \
	SOMNIA_AGENT_PLATFORM=$(SOMNIA_AGENT_PLATFORM) \
	JSON_API_AGENT_ID=$(JSON_API_AGENT_ID) \
	AUCTION_CLOCK_GAS_LIMIT=$(AUCTION_CLOCK_GAS_LIMIT) \
	AUCTION_CLOCK_DEPLOY_VALUE=$(AUCTION_CLOCK_DEPLOY_VALUE) \
	SOMNIA_USE_FFI_DEPLOY=true \
	forge script script/DeployCore.s.sol:DeployCoreScript \
		--rpc-url $(RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--ffi \
		--broadcast

deploy-testnet-consumer: build
	DUTCH_AUCTION_ADDRESS=$(DUTCH_AUCTION_ADDRESS) \
	DATA_PROVIDER_ADDRESS=$(DATA_PROVIDER_ADDRESS) \
	CONSUMER_SNAP_THRESHOLD=$(CONSUMER_SNAP_THRESHOLD) \
	CONSUMER_TARGET_DATA_TYPE="$(CONSUMER_TARGET_DATA_TYPE)" \
	CONSUMER_HANDLER_GAS_LIMIT=$(CONSUMER_HANDLER_GAS_LIMIT) \
	CONSUMER_HANDLER_DEPLOY_VALUE=$(CONSUMER_HANDLER_DEPLOY_VALUE) \
	SOMNIA_USE_FFI_DEPLOY=true \
	forge script script/ConsumerHandler.s.sol:ConsumerHandlerScript \
		--rpc-url $(RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--ffi \
		--broadcast

verify-testnet-escrow: build
	forge verify-contract \
		--chain-id 50312 \
		--rpc-url $(RPC_URL) \
		$(TESTNET_ESCROW_ADDRESS) \
		src/Escrow.sol:Escrow \
		--constructor-args $$(cast abi-encode "constructor(address)" $$(cast wallet address --private-key $(PRIVATE_KEY))) \
		--verifier blockscout \
		--verifier-url $(SOMNIA_TESTNET_VERIFIER_URL) \
		--watch

verify-testnet-auction-clock: build
	forge verify-contract \
		--chain-id 50312 \
		--rpc-url $(RPC_URL) \
		$(TESTNET_AUCTION_CLOCK_ADDRESS) \
		src/AuctionClock.sol:AuctionClock \
		--constructor-args $$(cast abi-encode "constructor(address,uint64)" "$(TESTNET_DUTCH_AUCTION_ADDRESS)" "$(AUCTION_CLOCK_GAS_LIMIT)") \
		--verifier blockscout \
		--verifier-url $(SOMNIA_TESTNET_VERIFIER_URL) \
		--watch

verify-testnet-dutch-auction: build
	forge verify-contract \
		--chain-id 50312 \
		--rpc-url $(RPC_URL) \
		$(TESTNET_DUTCH_AUCTION_ADDRESS) \
		src/DutchAuction.sol:DutchAuction \
		--constructor-args $$(cast abi-encode "constructor(address,address)" "$(TESTNET_AUCTION_CLOCK_ADDRESS)" "$(TESTNET_ESCROW_ADDRESS)") \
		--verifier blockscout \
		--verifier-url $(SOMNIA_TESTNET_VERIFIER_URL) \
		--watch

verify-testnet-data-provider: build
	forge verify-contract \
		--chain-id 50312 \
		--rpc-url $(RPC_URL) \
		$(TESTNET_DATA_PROVIDER_ADDRESS) \
		src/DataProvider.sol:DataProvider \
		--constructor-args $$(cast abi-encode "constructor(address,uint256,address,address)" "$(SOMNIA_AGENT_PLATFORM)" "$(JSON_API_AGENT_ID)" "$(TESTNET_ESCROW_ADDRESS)" "$(TESTNET_DUTCH_AUCTION_ADDRESS)") \
		--verifier blockscout \
		--verifier-url $(SOMNIA_TESTNET_VERIFIER_URL) \
		--watch

verify-testnet-service-registry: build
	forge verify-contract \
		--chain-id 50312 \
		--rpc-url $(RPC_URL) \
		$(TESTNET_SERVICE_REGISTRY_ADDRESS) \
		src/ServiceRegistry.sol:ServiceRegistry \
		--verifier blockscout \
		--verifier-url $(SOMNIA_TESTNET_VERIFIER_URL) \
		--watch

verify-testnet-consumer-handler: build
	forge verify-contract \
		--chain-id 50312 \
		--rpc-url $(RPC_URL) \
		$(TESTNET_CONSUMER_HANDLER_ADDRESS) \
		src/ConsumerHandler.sol:ConsumerHandler \
		--constructor-args $$(cast abi-encode "constructor(address,address,uint256,string,uint64)" "$(TESTNET_DUTCH_AUCTION_ADDRESS)" "$(TESTNET_DATA_PROVIDER_ADDRESS)" "$(CONSUMER_SNAP_THRESHOLD)" "$(CONSUMER_TARGET_DATA_TYPE)" "$(CONSUMER_HANDLER_GAS_LIMIT)") \
		--verifier blockscout \
		--verifier-url $(SOMNIA_TESTNET_VERIFIER_URL) \
		--watch

verify-testnet-core: verify-testnet-escrow verify-testnet-auction-clock verify-testnet-dutch-auction verify-testnet-data-provider verify-testnet-service-registry

verify-testnet-all: verify-testnet-core verify-testnet-consumer-handler
