// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {ConsumerHandler} from "../src/ConsumerHandler.sol";
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/Script.sol";
import {SomniaFFIScript} from "./utils/SomniaFFIScript.sol";

contract ConsumerHandlerScript is Script, SomniaFFIScript {
    ConsumerHandler public consumerHandler;

    function run() public {
        if (_ffiEnabled()) {
            _runSomniaFfi();
            return;
        }

        address dutchAuction = vm.envAddress("DUTCH_AUCTION_ADDRESS");
        address dataProvider = vm.envAddress("DATA_PROVIDER_ADDRESS");
        uint256 snapThreshold = vm.envUint("CONSUMER_SNAP_THRESHOLD");
        string memory targetDataType = vm.envString("CONSUMER_TARGET_DATA_TYPE");
        uint64 gasLimit = uint64(vm.envUint("CONSUMER_HANDLER_GAS_LIMIT"));
        uint256 deployValue = vm.envUint("CONSUMER_HANDLER_DEPLOY_VALUE");

        vm.startBroadcast();
        consumerHandler =
            new ConsumerHandler{value: deployValue}(dutchAuction, dataProvider, snapThreshold, targetDataType, gasLimit);
        vm.stopBroadcast();
    }

    function _runSomniaFfi() internal {
        address dutchAuction = vm.envAddress("DUTCH_AUCTION_ADDRESS");
        address dataProvider = vm.envAddress("DATA_PROVIDER_ADDRESS");
        uint256 snapThreshold = vm.envUint("CONSUMER_SNAP_THRESHOLD");
        string memory targetDataType = vm.envString("CONSUMER_TARGET_DATA_TYPE");
        uint64 gasLimit = uint64(vm.envUint("CONSUMER_HANDLER_GAS_LIMIT"));
        uint256 deployValue = vm.envUint("CONSUMER_HANDLER_DEPLOY_VALUE");

        string[] memory constructorArgs = new string[](5);
        constructorArgs[0] = vm.toString(dutchAuction);
        constructorArgs[1] = vm.toString(dataProvider);
        constructorArgs[2] = vm.toString(snapThreshold);
        constructorArgs[3] = targetDataType;
        constructorArgs[4] = vm.toString(uint256(gasLimit));

        address consumerHandlerAddress = _deployViaForgeCreate(
            "src/ConsumerHandler.sol:ConsumerHandler",
            constructorArgs,
            vm.toString(deployValue)
        );

        console2.log("ConsumerHandler:", consumerHandlerAddress);
    }
}
