// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {SomniaFFICommandBuilder} from "../script/utils/SomniaFFICommandBuilder.sol";

contract SomniaFFICommandBuilderTest is Test {
    function test_buildForgeCreateCommandPlacesContractBeforeConstructorArgs()
        public
        pure
    {
        string[] memory constructorArgs = new string[](2);
        constructorArgs[0] = "arg-1";
        constructorArgs[1] = "arg-2";

        string[] memory command = SomniaFFICommandBuilder.buildForgeCreateCommand(
            "https://rpc.test",
            "0xabc",
            "src/Escrow.sol:Escrow",
            constructorArgs,
            ""
        );

        assertEq(command[0], "forge");
        assertEq(command[1], "create");
        assertEq(command[6], "--broadcast");
        assertEq(command[7], "src/Escrow.sol:Escrow");
        assertEq(command[8], "--constructor-args");
        assertEq(command[9], "arg-1");
        assertEq(command[10], "arg-2");
    }

    function test_buildForgeCreateCommandIncludesValueWhenProvided()
        public
        pure
    {
        string[] memory constructorArgs = new string[](0);

        string[] memory command = SomniaFFICommandBuilder.buildForgeCreateCommand(
            "https://rpc.test",
            "0xabc",
            "src/AuctionClock.sol:AuctionClock",
            constructorArgs,
            "32ether"
        );

        assertEq(command[7], "--value");
        assertEq(command[8], "32ether");
        assertEq(command[9], "src/AuctionClock.sol:AuctionClock");
    }
}
