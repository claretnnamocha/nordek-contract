// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MyToken} from "./MyToken.sol";
import "hardhat/console.sol";

contract Crowdsale {
    MyToken public token;
    uint256 public rate = 1000; // 1 ETH = 1000 MTK
    uint256 public crowdSaleStartTime;
    uint256 public crowdSaleEndTime;
    uint256 public totalRaised;
    address payable public wallet;
    bool public crowdSaleIsHalted = false;

    uint256 public vestingCliff;
    uint256 public vestingStartTime;
    uint256 public vestingDuration;

    mapping(address => uint256) public released;
    mapping(address => uint256) public balances;

    uint256 constant DECIMAL_FACTOR = 10 ** 18;

    event TokenPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 amount
    );

    constructor(
        uint256 _crowdSaleStartTime,
        uint256 _crowdSaleEndTime,
        address payable _wallet,
        MyToken _token,
        uint256 _vestingCliff,
        uint256 _vestingStartTime,
        uint256 _vestingDuration
    ) {
        require(
            _crowdSaleEndTime > _crowdSaleStartTime,
            "End time must be after start time"
        );
        require(_wallet != address(0), "Wallet address cannot be zero");
        require(
            _vestingCliff <= _vestingDuration,
            "Cliff must be less than or equal to duration"
        );

        vestingCliff = _vestingStartTime + _vestingCliff;
        vestingStartTime = _vestingStartTime;
        vestingDuration = _vestingDuration;

        crowdSaleStartTime = _crowdSaleStartTime;
        crowdSaleEndTime = _crowdSaleEndTime;
        wallet = _wallet;
        token = _token;
    }

    modifier onlyWhileOpen(uint256 timestamp) {
        require(
            timestamp >= crowdSaleStartTime && timestamp <= crowdSaleEndTime,
            "Crowdsale is not open"
        );

        require(!crowdSaleIsHalted, "Crowdsale has been halted");
        _;
    }

    function buyTokens(
        address _beneficiary,
        uint256 timestamp
    ) public payable onlyWhileOpen(timestamp) {
        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount * rate;
        totalRaised += weiAmount;
        balances[_beneficiary] += tokens;
        wallet.transfer(weiAmount);
        token.transfer(_beneficiary, tokens);
        emit TokenPurchase(msg.sender, _beneficiary, weiAmount, tokens);
    }

    function toggleHalt() public {
        crowdSaleIsHalted = !crowdSaleIsHalted;
    }

    function releasedAmount(address beneficiary) public view returns (uint256) {
        return released[beneficiary];
    }

    function vestedAmount(
        uint256 timestamp,
        address beneficiary
    ) public view returns (uint256) {
        if (timestamp < vestingCliff) {
            return 0;
        } else if (timestamp >= (vestingStartTime + vestingDuration)) {
            return balances[beneficiary];
        } else {
            return
                (balances[beneficiary] *
                    (((timestamp - vestingStartTime) * DECIMAL_FACTOR) /
                        vestingDuration)) / DECIMAL_FACTOR;
        }
    }

    function release(uint256 timestamp, address beneficiary) public {
        uint256 unreleased = releasableAmount(timestamp, beneficiary);
        released[beneficiary] += unreleased;
        token.transfer(beneficiary, unreleased);
    }

    function releasableAmount(
        uint256 timestamp,
        address beneficiary
    ) public view returns (uint256) {
        return vestedAmount(timestamp, beneficiary) - released[beneficiary];
    }
}
