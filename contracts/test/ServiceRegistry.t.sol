// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ServiceRegistry, IJsonApiAgent} from "../src/ServiceRegistry.sol";
import {MockAgentPlatform} from "../src/mocks/MockAgentPlatform.sol";

contract ServiceRegistryTest is Test {
    event ServiceRegistered(
        uint256 indexed serviceId,
        address indexed provider,
        string dataType,
        uint256 pricePerRequest
    );
    event ServiceStatusChanged(
        uint256 indexed serviceId,
        ServiceRegistry.ServiceStatus newStatus
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
    event RequestCreated(
        uint256 indexed requestId,
        uint256 indexed agentId,
        address indexed callbackAddress,
        bytes4 callbackSelector,
        bytes payload,
        uint256 deposit
    );

    address internal constant PLATFORM_ADDRESS =
        0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;

    ServiceRegistry internal registry;

    address internal provider = address(0xBEEF);
    address internal consumer = address(0xCAFE);
    address internal other = address(0xDEAD);

    uint256 internal constant PLATFORM_DEPOSIT = 0.03 ether;
    uint256 internal constant EXPECTED_AGENT_DEPOSIT = 0.12 ether;
    uint256 internal constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 internal constant SERVICE_PRICE = 2 ether;
    uint256 internal constant TIMEOUT_BLOCKS = 15;

    function setUp() public {
        registry = new ServiceRegistry();
        _installMockPlatform();
    }

    function test_registerServiceStoresMetadataAndEmitsEvent() public {
        vm.prank(provider);
        vm.expectEmit(true, true, false, true);
        emit ServiceRegistered(1, provider, "BTC/USD", SERVICE_PRICE);
        registry.registerService(
            "BTC/USD",
            "https://api.example/btc",
            "bitcoin.usd",
            8,
            SERVICE_PRICE,
            TIMEOUT_BLOCKS
        );

        ServiceRegistry.DataService memory service = registry.getService(1);

        assertEq(service.id, 1);
        assertEq(service.provider, provider);
        assertEq(service.dataType, "BTC/USD");
        assertEq(service.apiUrl, "https://api.example/btc");
        assertEq(service.jsonSelector, "bitcoin.usd");
        assertEq(service.decimals, 8);
        assertEq(service.pricePerRequest, SERVICE_PRICE);
        assertEq(service.timeoutBlocks, TIMEOUT_BLOCKS);
        assertEq(uint256(service.status), uint256(ServiceRegistry.ServiceStatus.Active));
        assertEq(service.totalRequests, 0);
        assertEq(service.totalDelivered, 0);
        assertEq(service.totalFailed, 0);
        assertEq(service.registeredAt, block.number);
    }

    function test_registerServiceRevertsOnEmptyUrlSelectorZeroPriceOrZeroTimeout() public {
        vm.prank(provider);
        vm.expectRevert(ServiceRegistry.EmptyApiUrl.selector);
        registry.registerService("BTC/USD", "", "bitcoin.usd", 8, SERVICE_PRICE, TIMEOUT_BLOCKS);

        vm.prank(provider);
        vm.expectRevert(ServiceRegistry.EmptyJsonSelector.selector);
        registry.registerService("BTC/USD", "https://api.example/btc", "", 8, SERVICE_PRICE, TIMEOUT_BLOCKS);

        vm.prank(provider);
        vm.expectRevert(ServiceRegistry.InvalidPricePerRequest.selector);
        registry.registerService("BTC/USD", "https://api.example/btc", "bitcoin.usd", 8, 0, TIMEOUT_BLOCKS);

        vm.prank(provider);
        vm.expectRevert(ServiceRegistry.InvalidTimeoutBlocks.selector);
        registry.registerService("BTC/USD", "https://api.example/btc", "bitcoin.usd", 8, SERVICE_PRICE, 0);
    }

    function test_requestDataStoresPendingRequestAndRefundsExcess() public {
        _registerDefaultService();
        vm.deal(consumer, 5 ether);

        uint256 balanceBefore = consumer.balance;

        vm.prank(consumer);
        vm.expectEmit(true, true, true, true);
        emit DataRequested(1, 1, consumer, SERVICE_PRICE, block.number);
        registry.requestData{value: 3 ether}(1);

        ServiceRegistry.ServiceRequest memory request = registry.getRequest(1);
        ServiceRegistry.DataService memory service = registry.getService(1);

        assertEq(consumer.balance, balanceBefore - SERVICE_PRICE);
        assertEq(request.id, 1);
        assertEq(request.serviceId, 1);
        assertEq(request.consumer, consumer);
        assertEq(request.payment, SERVICE_PRICE);
        assertEq(request.requestedAt, block.number);
        assertEq(request.timeoutBlocks, TIMEOUT_BLOCKS);
        assertEq(uint256(request.status), uint256(ServiceRegistry.RequestStatus.Pending));
        assertEq(request.deliveredPrice, 0);
        assertEq(request.agentRequestId, 0);
        assertEq(service.totalRequests, 1);
    }

    function test_requestDataRevertsWhenServiceNotActiveOrInsufficientPayment() public {
        _registerDefaultService();
        vm.deal(consumer, 5 ether);

        vm.prank(provider);
        registry.pauseService(1);

        vm.prank(consumer);
        vm.expectRevert(ServiceRegistry.ServiceNotActive.selector);
        registry.requestData{value: SERVICE_PRICE}(1);

        vm.prank(provider);
        registry.resumeService(1);

        vm.prank(consumer);
        vm.expectRevert(ServiceRegistry.InsufficientPayment.selector);
        registry.requestData{value: SERVICE_PRICE - 1}(1);
    }

    function test_fulfillRequestBuildsAgentPayloadAndStoresAgentRequestId() public {
        _registerDefaultService();
        _requestDefaultService();
        vm.deal(provider, 1 ether);

        vm.recordLogs();
        vm.prank(provider);
        registry.fulfillRequest{value: EXPECTED_AGENT_DEPOSIT}(1);

        ServiceRegistry.ServiceRequest memory request = registry.getRequest(1);

        assertEq(request.agentRequestId, 77);
        assertEq(registry.agentRequestToServiceRequest(77), 1);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 expectedTopic = keccak256(
            "RequestCreated(uint256,uint256,address,bytes4,bytes,uint256)"
        );
        bytes memory expectedPayload = abi.encodeWithSelector(
            IJsonApiAgent.fetchUint.selector,
            "https://api.example/btc",
            "bitcoin.usd",
            uint8(8)
        );

        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].emitter == PLATFORM_ADDRESS &&
                logs[i].topics.length != 0 &&
                logs[i].topics[0] == expectedTopic
            ) {
                (
                    bytes4 callbackSelector,
                    bytes memory payload,
                    uint256 deposit
                ) = abi.decode(logs[i].data, (bytes4, bytes, uint256));

                assertEq(uint256(logs[i].topics[1]), 77);
                assertEq(uint256(logs[i].topics[2]), JSON_API_AGENT_ID);
                assertEq(address(uint160(uint256(logs[i].topics[3]))), address(registry));
                assertEq(callbackSelector, registry.handleServiceResponse.selector);
                assertEq(payload, expectedPayload);
                assertEq(deposit, EXPECTED_AGENT_DEPOSIT);
                found = true;
                break;
            }
        }

        assertTrue(found, "RequestCreated event not found");
    }

    function test_fulfillRequestRevertsForNonProviderTimedOutRequestOrLowDeposit() public {
        _registerDefaultService();
        _requestDefaultService();
        vm.deal(other, 1 ether);
        vm.deal(provider, 1 ether);

        vm.prank(other);
        vm.expectRevert(ServiceRegistry.OnlyProvider.selector);
        registry.fulfillRequest{value: EXPECTED_AGENT_DEPOSIT}(1);

        vm.roll(block.number + TIMEOUT_BLOCKS + 1);
        vm.prank(provider);
        vm.expectRevert(ServiceRegistry.RequestTimedOut.selector);
        registry.fulfillRequest{value: EXPECTED_AGENT_DEPOSIT}(1);

        _registerDefaultServiceFrom(other);
        _requestService(2, other);
        vm.deal(other, 1 ether);
        vm.prank(other);
        vm.expectRevert(ServiceRegistry.InsufficientAgentCallDeposit.selector);
        registry.fulfillRequest{value: EXPECTED_AGENT_DEPOSIT - 1}(2);
    }

    function test_handleServiceResponseTransfersPaymentAndMarksFulfilledOnSuccess() public {
        _registerDefaultService();
        _requestDefaultService();
        _fulfillDefaultRequest();

        ServiceRegistry.Response[] memory responses = new ServiceRegistry.Response[](1);
        responses[0] = ServiceRegistry.Response({
            validator: address(0x1234),
            result: abi.encode(uint256(105_250_000_000)),
            status: ServiceRegistry.ResponseStatus.Success,
            receipt: 0,
            timestamp: block.timestamp,
            executionCost: 0
        });

        uint256 providerBalanceBefore = provider.balance;

        vm.prank(PLATFORM_ADDRESS);
        vm.expectEmit(true, true, true, true);
        emit DataDelivered(1, 1, consumer, 105_250_000_000, block.timestamp);
        registry.handleServiceResponse(
            77,
            responses,
            ServiceRegistry.ResponseStatus.Success,
            _emptyPlatformRequest()
        );

        ServiceRegistry.ServiceRequest memory request = registry.getRequest(1);
        ServiceRegistry.DataService memory service = registry.getService(1);

        assertEq(provider.balance, providerBalanceBefore + SERVICE_PRICE);
        assertEq(uint256(request.status), uint256(ServiceRegistry.RequestStatus.Fulfilled));
        assertEq(request.deliveredPrice, 105_250_000_000);
        assertEq(service.totalDelivered, 1);
        assertEq(service.totalFailed, 0);
    }

    function test_handleServiceResponseMarksFailedWithoutPayingProvider() public {
        _registerDefaultService();
        _requestDefaultService();
        _fulfillDefaultRequest();

        ServiceRegistry.Response[] memory responses = new ServiceRegistry.Response[](0);
        uint256 providerBalanceBefore = provider.balance;

        vm.prank(PLATFORM_ADDRESS);
        vm.expectEmit(true, false, false, true);
        emit RequestFailed(1, 77);
        registry.handleServiceResponse(
            77,
            responses,
            ServiceRegistry.ResponseStatus.Failed,
            _emptyPlatformRequest()
        );

        ServiceRegistry.ServiceRequest memory request = registry.getRequest(1);
        ServiceRegistry.DataService memory service = registry.getService(1);

        assertEq(provider.balance, providerBalanceBefore);
        assertEq(uint256(request.status), uint256(ServiceRegistry.RequestStatus.Failed));
        assertEq(service.totalDelivered, 0);
        assertEq(service.totalFailed, 1);
    }

    function test_claimRefundReturnsPaymentAfterTimeout() public {
        _registerDefaultService();
        _requestDefaultService();

        uint256 balanceBefore = consumer.balance;

        vm.roll(block.number + TIMEOUT_BLOCKS + 1);
        vm.prank(consumer);
        vm.expectEmit(true, false, false, true);
        emit RequestRefunded(1, consumer, SERVICE_PRICE);
        registry.claimRefund(1);

        ServiceRegistry.ServiceRequest memory request = registry.getRequest(1);

        assertEq(consumer.balance, balanceBefore + SERVICE_PRICE);
        assertEq(uint256(request.status), uint256(ServiceRegistry.RequestStatus.Refunded));
    }

    function test_claimRefundAllowsFailedRequestAfterTimeout() public {
        _registerDefaultService();
        _requestDefaultService();
        _fulfillDefaultRequest();

        ServiceRegistry.Response[] memory responses = new ServiceRegistry.Response[](0);
        vm.prank(PLATFORM_ADDRESS);
        registry.handleServiceResponse(
            77,
            responses,
            ServiceRegistry.ResponseStatus.Failed,
            _emptyPlatformRequest()
        );

        uint256 balanceBefore = consumer.balance;

        vm.roll(block.number + TIMEOUT_BLOCKS + 1);
        vm.prank(consumer);
        registry.claimRefund(1);

        assertEq(consumer.balance, balanceBefore + SERVICE_PRICE);
        assertEq(
            uint256(registry.getRequest(1).status),
            uint256(ServiceRegistry.RequestStatus.Refunded)
        );
    }

    function test_claimRefundRevertsForNonConsumerNonRefundableOrTooEarly() public {
        _registerDefaultService();
        _requestDefaultService();

        vm.prank(other);
        vm.expectRevert(ServiceRegistry.OnlyConsumer.selector);
        registry.claimRefund(1);

        vm.prank(consumer);
        vm.expectRevert(ServiceRegistry.TimeoutNotReached.selector);
        registry.claimRefund(1);

        vm.roll(block.number + TIMEOUT_BLOCKS + 1);
        vm.prank(consumer);
        registry.claimRefund(1);

        vm.prank(consumer);
        vm.expectRevert(ServiceRegistry.RequestNotRefundable.selector);
        registry.claimRefund(1);
    }

    function test_pauseResumeDeactivateAreProviderOnly() public {
        _registerDefaultService();

        vm.prank(other);
        vm.expectRevert(ServiceRegistry.OnlyProvider.selector);
        registry.pauseService(1);

        vm.prank(provider);
        vm.expectEmit(true, false, false, true);
        emit ServiceStatusChanged(1, ServiceRegistry.ServiceStatus.Paused);
        registry.pauseService(1);
        assertEq(
            uint256(registry.getService(1).status),
            uint256(ServiceRegistry.ServiceStatus.Paused)
        );

        vm.prank(provider);
        vm.expectEmit(true, false, false, true);
        emit ServiceStatusChanged(1, ServiceRegistry.ServiceStatus.Active);
        registry.resumeService(1);
        assertEq(
            uint256(registry.getService(1).status),
            uint256(ServiceRegistry.ServiceStatus.Active)
        );

        vm.prank(provider);
        vm.expectEmit(true, false, false, true);
        emit ServiceStatusChanged(1, ServiceRegistry.ServiceStatus.Deactivated);
        registry.deactivateService(1);
        assertEq(
            uint256(registry.getService(1).status),
            uint256(ServiceRegistry.ServiceStatus.Deactivated)
        );
    }

    function test_getActiveServicesAndProviderServicesReturnExpectedIds() public {
        _registerDefaultService();
        _registerDefaultServiceFrom(other);

        vm.prank(provider);
        registry.pauseService(1);

        uint256[] memory activeServices = registry.getActiveServices();
        uint256[] memory providerServices = registry.getProviderServices(provider);
        uint256[] memory otherServices = registry.getProviderServices(other);

        assertEq(activeServices.length, 1);
        assertEq(activeServices[0], 2);
        assertEq(providerServices.length, 1);
        assertEq(providerServices[0], 1);
        assertEq(otherServices.length, 1);
        assertEq(otherServices[0], 2);
    }

    function test_endToEndFulfillmentFlow() public {
        _registerDefaultService();
        _requestDefaultService();
        _fulfillDefaultRequest();

        ServiceRegistry.Response[] memory responses = new ServiceRegistry.Response[](1);
        responses[0] = ServiceRegistry.Response({
            validator: address(0xABCD),
            result: abi.encode(uint256(2_500e8)),
            status: ServiceRegistry.ResponseStatus.Success,
            receipt: 0,
            timestamp: block.timestamp,
            executionCost: 0
        });

        uint256 providerBalanceBefore = provider.balance;

        vm.prank(PLATFORM_ADDRESS);
        registry.handleServiceResponse(
            77,
            responses,
            ServiceRegistry.ResponseStatus.Success,
            _emptyPlatformRequest()
        );

        ServiceRegistry.ServiceRequest memory request = registry.getRequest(1);
        ServiceRegistry.DataService memory service = registry.getService(1);

        assertEq(provider.balance, providerBalanceBefore + SERVICE_PRICE);
        assertEq(uint256(request.status), uint256(ServiceRegistry.RequestStatus.Fulfilled));
        assertEq(request.deliveredPrice, 2_500e8);
        assertEq(service.totalRequests, 1);
        assertEq(service.totalDelivered, 1);
        assertEq(service.totalFailed, 0);
    }

    function _registerDefaultService() internal {
        _registerDefaultServiceFrom(provider);
    }

    function _registerDefaultServiceFrom(address serviceProvider) internal {
        vm.prank(serviceProvider);
        registry.registerService(
            "BTC/USD",
            "https://api.example/btc",
            "bitcoin.usd",
            8,
            SERVICE_PRICE,
            TIMEOUT_BLOCKS
        );
    }

    function _requestDefaultService() internal {
        _requestService(1, consumer);
    }

    function _requestService(uint256 serviceId, address buyer) internal {
        vm.deal(buyer, 5 ether);
        vm.prank(buyer);
        registry.requestData{value: SERVICE_PRICE}(serviceId);
    }

    function _fulfillDefaultRequest() internal {
        vm.deal(provider, 1 ether);
        vm.prank(provider);
        registry.fulfillRequest{value: EXPECTED_AGENT_DEPOSIT}(1);
    }

    function _installMockPlatform() internal {
        MockAgentPlatform mock = new MockAgentPlatform();

        vm.etch(PLATFORM_ADDRESS, address(mock).code);
        vm.store(PLATFORM_ADDRESS, bytes32(uint256(0)), bytes32(uint256(77)));
        vm.store(
            PLATFORM_ADDRESS,
            bytes32(uint256(1)),
            bytes32(uint256(PLATFORM_DEPOSIT))
        );
    }

    function _emptyPlatformRequest()
        internal
        pure
        returns (ServiceRegistry.Request memory details)
    {}
}
