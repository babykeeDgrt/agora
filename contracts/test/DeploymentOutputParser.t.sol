// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {DeploymentOutputParser} from "../script/utils/DeploymentOutputParser.sol";

contract DeploymentOutputParserHarness {
    function extractLineValue(
        string memory output,
        string memory prefix
    ) external pure returns (string memory) {
        return DeploymentOutputParser.extractLineValue(output, prefix);
    }
}

contract DeploymentOutputParserTest is Test {
    DeploymentOutputParserHarness internal harness = new DeploymentOutputParserHarness();

    function test_extractLineValueReturnsMatchingValue() public pure {
        string memory output =
            "No files changed, compilation skipped\nDeployer: 0x1234\nDeployed to: 0x8872f70DF76061728Dba2De51EEF124A0df04c7a\nTransaction hash: 0xabc";

        string memory deployedAddress = DeploymentOutputParser.extractLineValue(
            output,
            "Deployed to:"
        );

        assertEq(
            deployedAddress,
            "0x8872f70DF76061728Dba2De51EEF124A0df04c7a"
        );
    }

    function test_extractLineValueRevertsWhenPrefixMissing() public {
        vm.expectRevert(
            DeploymentOutputParser.MissingOutputPrefix.selector
        );
        harness.extractLineValue("hello", "Deployed to:");
    }

    function test_trimRemovesSurroundingWhitespace() public pure {
        string memory trimmed = DeploymentOutputParser.trim(
            "  \n\r\t50312 \n"
        );

        assertEq(trimmed, "50312");
    }

    function test_parseUintOutputParsesUtf8Number() public pure {
        assertEq(DeploymentOutputParser.parseUintOutput(bytes("131\n")), 131);
    }

    function test_parseUintOutputParsesRawHexDecodedBytes() public pure {
        bytes memory raw = new bytes(1);
        raw[0] = bytes1(uint8(0x83));

        assertEq(DeploymentOutputParser.parseUintOutput(raw), 131);
    }
}
