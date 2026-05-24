// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {AuctionClock} from "../src/AuctionClock.sol";
import {DutchAuction} from "../src/DutchAuction.sol";
import {DataProvider} from "../src/DataProvider.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";

contract DeployLocalScript is Script {
    uint256 internal constant LOCAL_JSON_API_AGENT_ID = 13174292974160097713;
    address internal constant LOCAL_PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;

    function run() public {
        uint256 privateKey = vm.envUint("LOCAL_PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        uint64 auctionClockGasLimit = uint64(vm.envUint("AUCTION_CLOCK_GAS_LIMIT"));

        uint256 currentNonce = vm.getNonce(deployer);
        address predictedDutchAuction = vm.computeCreateAddress(deployer, currentNonce + 2);

        vm.startBroadcast(privateKey);

        Escrow escrow = new Escrow(deployer);
        AuctionClock auctionClock = new AuctionClock{value: 32 ether}(predictedDutchAuction, auctionClockGasLimit);
        DutchAuction dutchAuction = new DutchAuction(address(auctionClock), address(escrow));
        DataProvider dataProvider =
            new DataProvider(LOCAL_PLATFORM, LOCAL_JSON_API_AGENT_ID, address(escrow), address(dutchAuction));
        ServiceRegistry serviceRegistry = new ServiceRegistry();
        escrow.setDataProvider(address(dataProvider));

        vm.stopBroadcast();

        console2.log("MockAgentPlatform:", LOCAL_PLATFORM);
        console2.log("Escrow:", address(escrow));
        console2.log("AuctionClock:", address(auctionClock));
        console2.log("DutchAuction:", address(dutchAuction));
        console2.log("DataProvider:", address(dataProvider));
        console2.log("ServiceRegistry:", address(serviceRegistry));
    }
}
