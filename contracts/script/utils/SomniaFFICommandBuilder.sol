// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

library SomniaFFICommandBuilder {
    function buildForgeCreateCommand(
        string memory rpcUrl,
        string memory privateKey,
        string memory contractId,
        string[] memory constructorArgs,
        string memory value
    ) internal pure returns (string[] memory command) {
        bool hasValue = bytes(value).length != 0;
        bool hasConstructorArgs = constructorArgs.length != 0;

        uint256 length = 8;
        if (hasValue) length += 2;
        if (hasConstructorArgs) length += 1 + constructorArgs.length;

        command = new string[](length);
        uint256 cursor = 0;

        command[cursor++] = "forge";
        command[cursor++] = "create";
        command[cursor++] = "--rpc-url";
        command[cursor++] = rpcUrl;
        command[cursor++] = "--private-key";
        command[cursor++] = privateKey;
        command[cursor++] = "--broadcast";

        if (hasValue) {
            command[cursor++] = "--value";
            command[cursor++] = value;
        }

        command[cursor++] = contractId;

        if (hasConstructorArgs) {
            command[cursor++] = "--constructor-args";
            for (uint256 i = 0; i < constructorArgs.length; i++) {
                command[cursor++] = constructorArgs[i];
            }
        }
    }
}
