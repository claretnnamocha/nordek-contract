import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther } from "ethers";
import { ethers } from "hardhat";

describe("MyToken", function () {
  let MyToken: any,
    myToken: any,
    owner: HardhatEthersSigner,
    addr1: HardhatEthersSigner,
    addr2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy();
  });

  it("should have correct total supply", async function () {
    const totalSupply = await myToken.totalSupply();
    expect(totalSupply).to.equal(parseEther("1000000"));
  });

  it("should transfer tokens correctly", async function () {
    const transferAmount = parseEther("100");
    await myToken.transfer(addr1.address, transferAmount);
    const addr1Balance = await myToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount);
  });

  it("should approve and transferFrom correctly", async function () {
    const approveAmount = parseEther("200");
    const transferAmount = parseEther("150");
    await myToken.approve(addr1.address, approveAmount);
    await myToken
      .connect(addr1)
      .transferFrom(owner.address, addr2.address, transferAmount);
    const addr2Balance = await myToken.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(transferAmount);
    const ownerAllowance = await myToken.allowance(
      owner.address,
      addr1.address
    );
    expect(ownerAllowance).to.equal(approveAmount - transferAmount);
  });
});
