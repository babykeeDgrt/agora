export const serviceRegistryAbi = [
    {
        type: "function",
        name: "JSON_API_AGENT_ID",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "PER_AGENT_EXECUTION_COST",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "PLATFORM",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IAgentRequester",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "SUBCOMMITTEE_SIZE",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "agentRequestToServiceRequest",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "claimRefund",
        inputs: [
            { name: "requestId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "deactivateService",
        inputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "fulfillRequest",
        inputs: [
            { name: "requestId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "getActiveServices",
        inputs: [],
        outputs: [
            { name: "ids", type: "uint256[]", internalType: "uint256[]" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getProviderServices",
        inputs: [
            { name: "provider", type: "address", internalType: "address" },
        ],
        outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getRequest",
        inputs: [
            { name: "requestId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ServiceRegistry.ServiceRequest",
                components: [
                    { name: "id", type: "uint256", internalType: "uint256" },
                    {
                        name: "serviceId",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "consumer",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "payment",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "requestedAt",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "timeoutBlocks",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "status",
                        type: "uint8",
                        internalType: "enum ServiceRegistry.RequestStatus",
                    },
                    {
                        name: "deliveredPrice",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "agentRequestId",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getService",
        inputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct ServiceRegistry.DataService",
                components: [
                    { name: "id", type: "uint256", internalType: "uint256" },
                    {
                        name: "provider",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "dataType",
                        type: "string",
                        internalType: "string",
                    },
                    { name: "apiUrl", type: "string", internalType: "string" },
                    {
                        name: "jsonSelector",
                        type: "string",
                        internalType: "string",
                    },
                    { name: "decimals", type: "uint8", internalType: "uint8" },
                    {
                        name: "pricePerRequest",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "timeoutBlocks",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "status",
                        type: "uint8",
                        internalType: "enum ServiceRegistry.ServiceStatus",
                    },
                    {
                        name: "totalRequests",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "totalDelivered",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "totalFailed",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "registeredAt",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getServiceRequests",
        inputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "handleServiceResponse",
        inputs: [
            {
                name: "agentRequestId",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "responses",
                type: "tuple[]",
                internalType: "struct ServiceRegistry.Response[]",
                components: [
                    {
                        name: "validator",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "result", type: "bytes", internalType: "bytes" },
                    {
                        name: "status",
                        type: "uint8",
                        internalType: "enum ServiceRegistry.ResponseStatus",
                    },
                    {
                        name: "receipt",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "timestamp",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "executionCost",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "status",
                type: "uint8",
                internalType: "enum ServiceRegistry.ResponseStatus",
            },
            {
                name: "",
                type: "tuple",
                internalType: "struct ServiceRegistry.Request",
                components: [
                    { name: "id", type: "uint256", internalType: "uint256" },
                    {
                        name: "requester",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "callbackAddress",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "callbackSelector",
                        type: "bytes4",
                        internalType: "bytes4",
                    },
                    {
                        name: "subcommittee",
                        type: "address[]",
                        internalType: "address[]",
                    },
                    {
                        name: "responses",
                        type: "tuple[]",
                        internalType: "struct ServiceRegistry.Response[]",
                        components: [
                            {
                                name: "validator",
                                type: "address",
                                internalType: "address",
                            },
                            {
                                name: "result",
                                type: "bytes",
                                internalType: "bytes",
                            },
                            {
                                name: "status",
                                type: "uint8",
                                internalType:
                                    "enum ServiceRegistry.ResponseStatus",
                            },
                            {
                                name: "receipt",
                                type: "uint256",
                                internalType: "uint256",
                            },
                            {
                                name: "timestamp",
                                type: "uint256",
                                internalType: "uint256",
                            },
                            {
                                name: "executionCost",
                                type: "uint256",
                                internalType: "uint256",
                            },
                        ],
                    },
                    {
                        name: "responseCount",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "failureCount",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "threshold",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "createdAt",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "deadline",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "status",
                        type: "uint8",
                        internalType: "enum ServiceRegistry.ResponseStatus",
                    },
                    {
                        name: "consensusType",
                        type: "uint8",
                        internalType: "uint8",
                    },
                    {
                        name: "remainingBudget",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "perAgentBudget",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "pauseService",
        inputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "registerService",
        inputs: [
            { name: "dataType", type: "string", internalType: "string" },
            { name: "apiUrl", type: "string", internalType: "string" },
            { name: "jsonSelector", type: "string", internalType: "string" },
            { name: "decimals", type: "uint8", internalType: "uint8" },
            {
                name: "pricePerRequest",
                type: "uint256",
                internalType: "uint256",
            },
            { name: "timeoutBlocks", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "requestCount",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "requestData",
        inputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            { name: "requestId", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "requests",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [
            { name: "id", type: "uint256", internalType: "uint256" },
            { name: "serviceId", type: "uint256", internalType: "uint256" },
            { name: "consumer", type: "address", internalType: "address" },
            { name: "payment", type: "uint256", internalType: "uint256" },
            { name: "requestedAt", type: "uint256", internalType: "uint256" },
            { name: "timeoutBlocks", type: "uint256", internalType: "uint256" },
            {
                name: "status",
                type: "uint8",
                internalType: "enum ServiceRegistry.RequestStatus",
            },
            {
                name: "deliveredPrice",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "agentRequestId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "resumeService",
        inputs: [
            { name: "serviceId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "serviceCount",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "services",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [
            { name: "id", type: "uint256", internalType: "uint256" },
            { name: "provider", type: "address", internalType: "address" },
            { name: "dataType", type: "string", internalType: "string" },
            { name: "apiUrl", type: "string", internalType: "string" },
            { name: "jsonSelector", type: "string", internalType: "string" },
            { name: "decimals", type: "uint8", internalType: "uint8" },
            {
                name: "pricePerRequest",
                type: "uint256",
                internalType: "uint256",
            },
            { name: "timeoutBlocks", type: "uint256", internalType: "uint256" },
            {
                name: "status",
                type: "uint8",
                internalType: "enum ServiceRegistry.ServiceStatus",
            },
            { name: "totalRequests", type: "uint256", internalType: "uint256" },
            {
                name: "totalDelivered",
                type: "uint256",
                internalType: "uint256",
            },
            { name: "totalFailed", type: "uint256", internalType: "uint256" },
            { name: "registeredAt", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "DataDelivered",
        inputs: [
            {
                name: "requestId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "serviceId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "consumer",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "price",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "timestamp",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "DataRequested",
        inputs: [
            {
                name: "requestId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "serviceId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "consumer",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "payment",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "blockNumber",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RequestFailed",
        inputs: [
            {
                name: "requestId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "agentRequestId",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RequestFulfilling",
        inputs: [
            {
                name: "requestId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "agentRequestId",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RequestRefunded",
        inputs: [
            {
                name: "requestId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "consumer",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "payment",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ServiceRegistered",
        inputs: [
            {
                name: "serviceId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "provider",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "dataType",
                type: "string",
                indexed: false,
                internalType: "string",
            },
            {
                name: "pricePerRequest",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ServiceStatusChanged",
        inputs: [
            {
                name: "serviceId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "newStatus",
                type: "uint8",
                indexed: false,
                internalType: "enum ServiceRegistry.ServiceStatus",
            },
        ],
        anonymous: false,
    },
    { type: "error", name: "EmptyApiUrl", inputs: [] },
    { type: "error", name: "EmptyJsonSelector", inputs: [] },
    { type: "error", name: "InsufficientAgentCallDeposit", inputs: [] },
    { type: "error", name: "InsufficientPayment", inputs: [] },
    { type: "error", name: "InvalidPricePerRequest", inputs: [] },
    { type: "error", name: "InvalidTimeoutBlocks", inputs: [] },
    { type: "error", name: "OnlyConsumer", inputs: [] },
    { type: "error", name: "OnlyPlatform", inputs: [] },
    { type: "error", name: "OnlyProvider", inputs: [] },
    { type: "error", name: "PayoutFailed", inputs: [] },
    { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
    { type: "error", name: "RefundFailed", inputs: [] },
    { type: "error", name: "RequestAlreadySubmitted", inputs: [] },
    { type: "error", name: "RequestNotFound", inputs: [] },
    { type: "error", name: "RequestNotPending", inputs: [] },
    { type: "error", name: "RequestNotRefundable", inputs: [] },
    { type: "error", name: "RequestTimedOut", inputs: [] },
    { type: "error", name: "ServiceNotActive", inputs: [] },
    { type: "error", name: "ServiceNotFound", inputs: [] },
    { type: "error", name: "TimeoutNotReached", inputs: [] },
];
