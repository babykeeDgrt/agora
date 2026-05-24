// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

library DeploymentOutputParser {
    error MissingOutputPrefix();

    function extractLineValue(
        string memory output,
        string memory prefix
    ) internal pure returns (string memory) {
        bytes memory outputBytes = bytes(output);
        bytes memory prefixBytes = bytes(prefix);

        for (uint256 i = 0; i + prefixBytes.length <= outputBytes.length; i++) {
            if (_matchesAt(outputBytes, prefixBytes, i)) {
                uint256 start = i + prefixBytes.length;
                while (
                    start < outputBytes.length &&
                    _isWhitespace(outputBytes[start])
                ) {
                    start++;
                }

                uint256 end = start;
                while (
                    end < outputBytes.length &&
                    outputBytes[end] != "\n" &&
                    outputBytes[end] != "\r"
                ) {
                    end++;
                }

                return trim(_slice(outputBytes, start, end));
            }
        }

        revert MissingOutputPrefix();
    }

    function trim(
        string memory value
    ) internal pure returns (string memory) {
        bytes memory data = bytes(value);
        if (data.length == 0) return value;

        uint256 start = 0;
        uint256 end = data.length;

        while (start < end && _isWhitespace(data[start])) {
            start++;
        }

        while (end > start && _isWhitespace(data[end - 1])) {
            end--;
        }

        return _slice(data, start, end);
    }

    function parseUintOutput(
        bytes memory rawOutput
    ) internal pure returns (uint256) {
        if (_looksLikeUtf8Text(rawOutput)) {
            return vmParseUint(trim(string(rawOutput)));
        }

        uint256 value;
        for (uint256 i = 0; i < rawOutput.length; i++) {
            value = (value << 8) | uint8(rawOutput[i]);
        }
        return value;
    }

    function _matchesAt(
        bytes memory haystack,
        bytes memory needle,
        uint256 offset
    ) private pure returns (bool) {
        for (uint256 i = 0; i < needle.length; i++) {
            if (haystack[offset + i] != needle[i]) return false;
        }
        return true;
    }

    function _slice(
        bytes memory data,
        uint256 start,
        uint256 end
    ) private pure returns (string memory) {
        bytes memory result = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = data[i];
        }
        return string(result);
    }

    function _isWhitespace(bytes1 char) private pure returns (bool) {
        return char == " " || char == "\n" || char == "\r" || char == "\t";
    }

    function _looksLikeUtf8Text(
        bytes memory data
    ) private pure returns (bool) {
        for (uint256 i = 0; i < data.length; i++) {
            bytes1 char = data[i];
            bool isDigit = char >= "0" && char <= "9";
            if (!(isDigit || _isWhitespace(char))) {
                return false;
            }
        }
        return data.length != 0;
    }

    function vmParseUint(string memory value) private pure returns (uint256) {
        bytes memory data = bytes(value);
        uint256 parsed;
        for (uint256 i = 0; i < data.length; i++) {
            parsed = parsed * 10 + (uint8(data[i]) - 48);
        }
        return parsed;
    }
}
