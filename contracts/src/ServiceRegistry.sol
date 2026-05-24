// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IAgentRequester, IJsonApiAgent} from "../interface/IServiceRegistry.sol";

contract ServiceRegistry is ReentrancyGuard {
    enum ServiceStatus {
        Active,
        Paused,
        Deactivated
    }

    enum RequestStatus {
        Pending,
        Fulfilled,
        Refunded,
        Failed
    }

    enum ResponseStatus {
        None,
        Pending,
        Success,
        Failed,
        TimedOut
    }

    struct DataService {
        uint256 id;
        address provider;
        string dataType;
        string apiUrl;
        string jsonSelector;
        uint8 decimals;
        uint256 pricePerRequest;
        uint256 timeoutBlocks;
        ServiceStatus status;
        uint256 totalRequests;
        uint256 totalDelivered;
        uint256 totalFailed;
        uint256 registeredAt;
    }

    struct ServiceRequest {
        uint256 id;
        uint256 serviceId;
        address consumer;
        uint256 payment;
        uint256 requestedAt;
        uint256 timeoutBlocks;
        RequestStatus status;
        uint256 deliveredPrice;
        uint256 agentRequestId;
    }

    struct Response {
        address validator;
        bytes result;
        ResponseStatus status;
        uint256 receipt;
        uint256 timestamp;
        uint256 executionCost;
    }

    struct Request {
        uint256 id;
        address requester;
        address callbackAddress;
        bytes4 callbackSelector;
        address[] subcommittee;
        Response[] responses;
        uint256 responseCount;
        uint256 failureCount;
        uint256 threshold;
        uint256 createdAt;
        uint256 deadline;
        ResponseStatus status;
        uint8 consensusType;
        uint256 remainingBudget;
        uint256 perAgentBudget;
    }

    error ServiceNotFound();
    error RequestNotFound();
    error EmptyApiUrl();
    error EmptyJsonSelector();
    error InvalidPricePerRequest();
    error InvalidTimeoutBlocks();
    error ServiceNotActive();
    error InsufficientPayment();
    error RefundFailed();
    error OnlyProvider();
    error RequestNotPending();
    error RequestTimedOut();
    error InsufficientAgentCallDeposit();
    error OnlyPlatform();
    error RequestAlreadySubmitted();
    error PayoutFailed();
    error OnlyConsumer();
    error TimeoutNotReached();
    error RequestNotRefundable();

    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);
    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 public constant PER_AGENT_EXECUTION_COST = 0.03 ether;
    uint256 public constant SUBCOMMITTEE_SIZE = 3;

    mapping(uint256 => DataService) public services;
    mapping(uint256 => ServiceRequest) public requests;
    mapping(uint256 => uint256) public agentRequestToServiceRequest;

    uint256 public serviceCount;
    uint256 public requestCount;

    uint256[] private activeServiceIds;
    mapping(uint256 => uint256[]) private serviceRequestIds;
    mapping(address => uint256[]) private providerServiceIds;

    event ServiceRegistered(
        uint256 indexed serviceId,
        address indexed provider,
        string dataType,
        uint256 pricePerRequest
    );
    event ServiceStatusChanged(
        uint256 indexed serviceId,
        ServiceStatus newStatus
    );
    event DataRequested(
        uint256 indexed requestId,
        uint256 indexed serviceId,
        address indexed consumer,
        uint256 payment,
        uint256 blockNumber
    );
    event RequestFulfilling(uint256 indexed requestId, uint256 agentRequestId);
    event DataDelivered(
        uint256 indexed requestId,
        uint256 indexed serviceId,
        address indexed consumer,
        uint256 price,
        uint256 timestamp
    );
    event RequestFailed(uint256 indexed requestId, uint256 agentRequestId);
    event RequestRefunded(
        uint256 indexed requestId,
        address consumer,
        uint256 payment
    );

    function registerService(
        string calldata dataType,
        string calldata apiUrl,
        string calldata jsonSelector,
        uint8 decimals,
        uint256 pricePerRequest,
        uint256 timeoutBlocks
    ) external returns (uint256 serviceId) {
        if (bytes(apiUrl).length == 0) revert EmptyApiUrl();
        if (bytes(jsonSelector).length == 0) revert EmptyJsonSelector();
        if (pricePerRequest == 0) revert InvalidPricePerRequest();
        if (timeoutBlocks == 0) revert InvalidTimeoutBlocks();

        serviceId = ++serviceCount;

        services[serviceId] = DataService({
            id: serviceId,
            provider: msg.sender,
            dataType: dataType,
            apiUrl: apiUrl,
            jsonSelector: jsonSelector,
            decimals: decimals,
            pricePerRequest: pricePerRequest,
            timeoutBlocks: timeoutBlocks,
            status: ServiceStatus.Active,
            totalRequests: 0,
            totalDelivered: 0,
            totalFailed: 0,
            registeredAt: block.number
        });

        activeServiceIds.push(serviceId);
        providerServiceIds[msg.sender].push(serviceId);

        emit ServiceRegistered(
            serviceId,
            msg.sender,
            dataType,
            pricePerRequest
        );
    }

    function requestData(
        uint256 serviceId
    ) external payable nonReentrant returns (uint256 requestId) {
        DataService storage service = _getExistingService(serviceId);
        if (service.status != ServiceStatus.Active) revert ServiceNotActive();
        if (msg.value < service.pricePerRequest) revert InsufficientPayment();

        uint256 payment = service.pricePerRequest;
        uint256 refund = msg.value - payment;

        requestId = ++requestCount;
        requests[requestId] = ServiceRequest({
            id: requestId,
            serviceId: serviceId,
            consumer: msg.sender,
            payment: payment,
            requestedAt: block.number,
            timeoutBlocks: service.timeoutBlocks,
            status: RequestStatus.Pending,
            deliveredPrice: 0,
            agentRequestId: 0
        });

        service.totalRequests += 1;
        serviceRequestIds[serviceId].push(requestId);

        if (refund != 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            if (!success) revert RefundFailed();
        }

        emit DataRequested(
            requestId,
            serviceId,
            msg.sender,
            payment,
            block.number
        );
    }

    function fulfillRequest(uint256 requestId) external payable nonReentrant {
        ServiceRequest storage request = _getExistingRequest(requestId);
        if (request.status != RequestStatus.Pending) revert RequestNotPending();

        DataService storage service = _getExistingService(request.serviceId);
        if (msg.sender != service.provider) revert OnlyProvider();
        if (block.number > request.requestedAt + request.timeoutBlocks)
            revert RequestTimedOut();
        if (request.agentRequestId != 0) revert RequestAlreadySubmitted();

        uint256 deposit = PLATFORM.getRequestDeposit() +
            (PER_AGENT_EXECUTION_COST * SUBCOMMITTEE_SIZE);
        if (msg.value < deposit) revert InsufficientAgentCallDeposit();

        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchUint.selector,
            service.apiUrl,
            service.jsonSelector,
            service.decimals
        );

        uint256 agentRequestId = PLATFORM.createRequest{value: deposit}(
            JSON_API_AGENT_ID,
            address(this),
            this.handleServiceResponse.selector,
            payload
        );

        request.agentRequestId = agentRequestId;
        agentRequestToServiceRequest[agentRequestId] = requestId;

        uint256 refund = msg.value - deposit;
        if (refund != 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            if (!success) revert RefundFailed();
        }

        emit RequestFulfilling(requestId, agentRequestId);
    }

    function handleServiceResponse(
        uint256 agentRequestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external nonReentrant {
        if (msg.sender != address(PLATFORM)) revert OnlyPlatform();

        uint256 requestId = agentRequestToServiceRequest[agentRequestId];
        ServiceRequest storage request = _getExistingRequest(requestId);
        if (request.status != RequestStatus.Pending) revert RequestNotPending();

        DataService storage service = _getExistingService(request.serviceId);

        if (status != ResponseStatus.Success || responses.length == 0) {
            request.status = RequestStatus.Failed;
            service.totalFailed += 1;
            emit RequestFailed(requestId, agentRequestId);
            return;
        }

        uint256 price = abi.decode(responses[0].result, (uint256));

        request.deliveredPrice = price;
        request.status = RequestStatus.Fulfilled;
        service.totalDelivered += 1;

        (bool success, ) = payable(service.provider).call{
            value: request.payment
        }("");
        if (!success) revert PayoutFailed();

        emit DataDelivered(
            requestId,
            request.serviceId,
            request.consumer,
            price,
            block.timestamp
        );
    }

    function claimRefund(uint256 requestId) external nonReentrant {
        ServiceRequest storage request = _getExistingRequest(requestId);
        if (msg.sender != request.consumer) revert OnlyConsumer();
        if (
            request.status != RequestStatus.Pending &&
            request.status != RequestStatus.Failed
        ) revert RequestNotRefundable();
        if (block.number <= request.requestedAt + request.timeoutBlocks)
            revert TimeoutNotReached();

        request.status = RequestStatus.Refunded;

        (bool success, ) = payable(request.consumer).call{
            value: request.payment
        }("");
        if (!success) revert RefundFailed();

        emit RequestRefunded(requestId, request.consumer, request.payment);
    }

    function pauseService(uint256 serviceId) external {
        DataService storage service = _getExistingService(serviceId);
        if (msg.sender != service.provider) revert OnlyProvider();

        service.status = ServiceStatus.Paused;
        emit ServiceStatusChanged(serviceId, ServiceStatus.Paused);
    }

    function resumeService(uint256 serviceId) external {
        DataService storage service = _getExistingService(serviceId);
        if (msg.sender != service.provider) revert OnlyProvider();

        service.status = ServiceStatus.Active;
        emit ServiceStatusChanged(serviceId, ServiceStatus.Active);
    }

    function deactivateService(uint256 serviceId) external {
        DataService storage service = _getExistingService(serviceId);
        if (msg.sender != service.provider) revert OnlyProvider();

        service.status = ServiceStatus.Deactivated;
        emit ServiceStatusChanged(serviceId, ServiceStatus.Deactivated);
    }

    function getService(
        uint256 serviceId
    ) external view returns (DataService memory) {
        return _getExistingService(serviceId);
    }

    function getRequest(
        uint256 requestId
    ) external view returns (ServiceRequest memory) {
        return _getExistingRequest(requestId);
    }

    function getActiveServices() external view returns (uint256[] memory ids) {
        uint256 activeCount;
        uint256 length = activeServiceIds.length;

        for (uint256 i = 0; i < length; i++) {
            if (services[activeServiceIds[i]].status == ServiceStatus.Active) {
                activeCount += 1;
            }
        }

        ids = new uint256[](activeCount);
        uint256 index;
        for (uint256 i = 0; i < length; i++) {
            uint256 serviceId = activeServiceIds[i];
            if (services[serviceId].status == ServiceStatus.Active) {
                ids[index] = serviceId;
                index += 1;
            }
        }
    }

    function getServiceRequests(
        uint256 serviceId
    ) external view returns (uint256[] memory) {
        _getExistingService(serviceId);
        return serviceRequestIds[serviceId];
    }

    function getProviderServices(
        address provider
    ) external view returns (uint256[] memory) {
        return providerServiceIds[provider];
    }

    function _getExistingService(
        uint256 serviceId
    ) internal view returns (DataService storage service) {
        if (serviceId == 0 || serviceId > serviceCount)
            revert ServiceNotFound();
        service = services[serviceId];
    }

    function _getExistingRequest(
        uint256 requestId
    ) internal view returns (ServiceRequest storage request) {
        if (requestId == 0 || requestId > requestCount)
            revert RequestNotFound();
        request = requests[requestId];
    }
}
