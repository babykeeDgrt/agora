// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {AuctionClock} from "../src/AuctionClock.sol";
import {DutchAuction} from "../src/DutchAuction.sol";
import {DataProvider} from "../src/DataProvider.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";
import {SomniaFFIScript} from "./utils/SomniaFFIScript.sol";

contract DeployCoreScript is Script, SomniaFFIScript {
    function run() public {
        if (_ffiEnabled()) {
            _runSomniaFfi();
            return;
        }

        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        address platform = vm.envAddress("SOMNIA_AGENT_PLATFORM");
        uint256 jsonApiAgentId = vm.envUint("JSON_API_AGENT_ID");
        uint64 auctionClockGasLimit = uint64(vm.envUint("AUCTION_CLOCK_GAS_LIMIT"));
        uint256 auctionClockDeployValue = vm.envOr(
            "AUCTION_CLOCK_DEPLOY_VALUE",
            uint256(32 ether)
        );

        uint256 currentNonce = vm.getNonce(deployer);
        address predictedDutchAuction = vm.computeCreateAddress(deployer, currentNonce + 2);

        vm.startBroadcast(privateKey);

        Escrow escrow = new Escrow(deployer);
        AuctionClock auctionClock =
            new AuctionClock{value: auctionClockDeployValue}(predictedDutchAuction, auctionClockGasLimit);
        DutchAuction dutchAuction = new DutchAuction(address(auctionClock), address(escrow));
        DataProvider dataProvider = new DataProvider(platform, jsonApiAgentId, address(escrow), address(dutchAuction));
        ServiceRegistry serviceRegistry = new ServiceRegistry();
        escrow.setDataProvider(address(dataProvider));

        vm.stopBroadcast();

        console2.log("Escrow:", address(escrow));
        console2.log("AuctionClock:", address(auctionClock));
        console2.log("DutchAuction:", address(dutchAuction));
        console2.log("DataProvider:", address(dataProvider));
        console2.log("ServiceRegistry:", address(serviceRegistry));
    }

    function _runSomniaFfi() internal {
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        address platform = vm.envAddress("SOMNIA_AGENT_PLATFORM");
        uint256 jsonApiAgentId = vm.envUint("JSON_API_AGENT_ID");
        uint64 auctionClockGasLimit = uint64(vm.envUint("AUCTION_CLOCK_GAS_LIMIT"));
        uint256 auctionClockDeployValue = vm.envOr(
            "AUCTION_CLOCK_DEPLOY_VALUE",
            uint256(32 ether)
        );

        uint256 currentNonce = _liveNonce(deployer);
        address predictedDutchAuction = vm.computeCreateAddress(deployer, currentNonce + 2);

        string[] memory escrowArgs = new string[](1);
        escrowArgs[0] = vm.toString(deployer);
        address escrow = _deployViaForgeCreate("src/Escrow.sol:Escrow", escrowArgs, "");

        string[] memory clockArgs = new string[](2);
        clockArgs[0] = vm.toString(predictedDutchAuction);
        clockArgs[1] = vm.toString(uint256(auctionClockGasLimit));
        address auctionClock = _deployViaForgeCreate(
            "src/AuctionClock.sol:AuctionClock",
            clockArgs,
            vm.toString(auctionClockDeployValue)
        );

        string[] memory dutchArgs = new string[](2);
        dutchArgs[0] = vm.toString(auctionClock);
        dutchArgs[1] = vm.toString(escrow);
        address dutchAuction = _deployViaForgeCreate(
            "src/DutchAuction.sol:DutchAuction",
            dutchArgs,
            ""
        );
        require(dutchAuction == predictedDutchAuction, "predicted address mismatch");

        string[] memory providerArgs = new string[](4);
        providerArgs[0] = vm.toString(platform);
        providerArgs[1] = vm.toString(jsonApiAgentId);
        providerArgs[2] = vm.toString(escrow);
        providerArgs[3] = vm.toString(dutchAuction);
        address dataProvider = _deployViaForgeCreate(
            "src/DataProvider.sol:DataProvider",
            providerArgs,
            ""
        );
        address serviceRegistry = _deployViaForgeCreate(
            "src/ServiceRegistry.sol:ServiceRegistry",
            new string[](0),
            ""
        );

        string[] memory setProviderArgs = new string[](1);
        setProviderArgs[0] = vm.toString(dataProvider);
        _castSend(escrow, "setDataProvider(address)", setProviderArgs);

        console2.log("Escrow:", escrow);
        console2.log("AuctionClock:", auctionClock);
        console2.log("DutchAuction:", dutchAuction);
        console2.log("DataProvider:", dataProvider);
        console2.log("ServiceRegistry:", serviceRegistry);
    }
}
