// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {DeploymentOutputParser} from "./DeploymentOutputParser.sol";
import {SomniaFFICommandBuilder} from "./SomniaFFICommandBuilder.sol";

abstract contract SomniaFFIScript is Script {
    function _ffiEnabled() internal view returns (bool) {
        return vm.envOr("SOMNIA_USE_FFI_DEPLOY", false);
    }

    function _liveNonce(address deployer) internal returns (uint256) {
        string[] memory command = new string[](3);
        command[0] = "bash";
        command[1] = "-lc";
        command[2] = string.concat(
            "cast nonce ",
            vm.toString(deployer),
            " --rpc-url ",
            vm.envString("RPC_URL"),
            " | tr -d '\\n' | sed 's/^/nonce=/'"
        );

        string memory output = string(vm.ffi(command));
        string memory nonceString = DeploymentOutputParser.extractLineValue(
            output,
            "nonce="
        );
        return vm.parseUint(nonceString);
    }

    function _deployViaForgeCreate(
        string memory contractId,
        string[] memory constructorArgs,
        string memory value
    ) internal returns (address) {
        string[] memory command = _forgeCreateCommand(
            contractId,
            constructorArgs,
            value
        );
        string memory output = string(vm.ffi(command));
        return
            vm.parseAddress(
                DeploymentOutputParser.extractLineValue(output, "Deployed to:")
            );
    }

    function _castSend(
        address target,
        string memory signature,
        string[] memory args
    ) internal {
        string[] memory command = new string[](8 + args.length);
        command[0] = "cast";
        command[1] = "send";
        command[2] = "--rpc-url";
        command[3] = vm.envString("RPC_URL");
        command[4] = "--private-key";
        command[5] = vm.envString("PRIVATE_KEY");
        command[6] = vm.toString(target);
        command[7] = signature;

        for (uint256 i = 0; i < args.length; i++) {
            command[8 + i] = args[i];
        }

        vm.ffi(command);
    }

    function _forgeCreateCommand(
        string memory contractId,
        string[] memory constructorArgs,
        string memory value
    ) private view returns (string[] memory command) {
        return SomniaFFICommandBuilder.buildForgeCreateCommand(
            vm.envString("RPC_URL"),
            vm.envString("PRIVATE_KEY"),
            contractId,
            constructorArgs,
            value
        );
    }
}
