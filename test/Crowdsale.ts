import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ContractTransactionResponse, parseEther } from "ethers";
import { ethers } from "hardhat";
import { Crowdsale, MyToken } from "../typechain-types";

let crowdsale: Crowdsale & {
    deploymentTransaction(): ContractTransactionResponse;
  },
  myToken: MyToken & {
    deploymentTransaction(): ContractTransactionResponse;
  },
  owner: HardhatEthersSigner,
  address1: HardhatEthersSigner,
  startTime: number,
  endTime: number;

describe("Crowdsale", function () {
  beforeEach(async function () {
    const [addr0, addr1] = await ethers.getSigners();

    const MyToken = await ethers.getContractFactory("MyToken");
    const my_token = await MyToken.deploy();

    startTime = (await time.latest()) + 86400; // start in 1 day
    endTime = startTime + 86400 * 30; // end in 30 days

    const cliffDuration = 90 * 86400; // 90 days
    const vestingDuration = 365 * 86400; // 365 days
    const vestingStart = await time.latest();
    const Crowdsale = await ethers.getContractFactory("Crowdsale");

    const crowd_sale = await Crowdsale.deploy(
      startTime,
      endTime,
      addr0.address,
      my_token.target,
      cliffDuration,
      vestingStart,
      vestingDuration
    );

    crowdsale = crowd_sale;
    myToken = my_token;
    owner = addr0;
    address1 = addr1;
  });

  it("should allow buying tokens during crowdsale", async function () {
    const investment = parseEther("1");
    const rate = await crowdsale.rate();
    const expectedTokens = investment * rate;

    await myToken.transfer(crowdsale.target, parseEther("200000"));
    const initialBalance = await myToken.balanceOf(address1.address);

    await time.increaseTo(startTime);
    const buyTimestamp = await time.latest();

    await crowdsale
      .connect(address1)
      .buyTokens(address1.address, buyTimestamp, { value: investment });

    const finalBalance = await myToken.balanceOf(address1.address);
    expect(finalBalance - initialBalance).to.equal(expectedTokens);
    const totalRaised = await crowdsale.totalRaised();
    expect(totalRaised).to.equal(investment);
  });

  it("should halt the crowdsale", async function () {
    await time.increaseTo(startTime);
    await crowdsale.toggleHalt();
    const isHalted = await crowdsale.crowdSaleIsHalted();

    expect(isHalted).to.be.true;
    const buyTimestamp = await time.latest();

    await expect(
      crowdsale
        .connect(address1)
        .buyTokens(address1.address, buyTimestamp, { value: parseEther("1") })
    ).to.be.revertedWith("Crowdsale has been halted");
  });

  it("should calculate vested amount correctly", async function () {
    const investment = parseEther("1");
    const rate = await crowdsale.rate();
    const expectedTokens = investment * rate;

    myToken.transfer(crowdsale.target, parseEther("200000"));

    await crowdsale
      .connect(address1)
      .buyTokens(address1.address, startTime, { value: investment });

    const vestTimestamp = startTime + 180 * 86400; // 180 days
    const vestedAmount = await crowdsale.vestedAmount(
      vestTimestamp,
      address1.address
    );
    expect(vestedAmount).to.equal("495890410958904109000");
  });

  it("should release tokens after vesting period", async function () {
    const investment = parseEther("1");
    const rate = await crowdsale.rate();
    const expectedTokens = investment * rate;

    await myToken.transfer(crowdsale.target, expectedTokens * BigInt(2));

    await time.increaseTo(startTime);

    const buyTimestamp = await time.latest();

    await crowdsale
      .connect(address1)
      .buyTokens(address1.address, buyTimestamp, { value: investment });

    const initialBalance = await myToken.balanceOf(address1.address);
    const current_time = await time.latest();
    const ONE_YEAR_ONE_SECOND = 365 * 86400 + 1;
    const timestamp = ONE_YEAR_ONE_SECOND + current_time; // Move time forward by 365 days + 1 second
    await crowdsale.release(timestamp, address1.address);
    const finalBalance = await myToken.balanceOf(address1.address);
    expect(finalBalance - initialBalance).to.equal(parseEther("1000"));
  });
});
