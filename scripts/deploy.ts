import { ethers } from "hardhat";

async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);

  const token = await ethers.deployContract("MyToken");
  await token.waitForDeployment();
  console.log(`MyToken deployed to ${token.target}`);

  const _crowdSaleStartTime = currentTimestampInSeconds + 86400; // start in 1 day
  const _crowdSaleEndTime = _crowdSaleStartTime + 86400 * 30; // end in 30 days
  const _token = token.target;
  const [_wallet] = await ethers.getSigners();
  const _vestingCliff = 90 * 86400; // 90 days
  const _vestingStartTime = currentTimestampInSeconds;
  const _vestingDuration = 365 * 86400; // 365 days

  const crowdSale = await ethers.deployContract("Crowdsale", [
    _crowdSaleStartTime,
    _crowdSaleEndTime,
    _token,
    _wallet,
    _vestingCliff,
    _vestingStartTime,
    _vestingDuration,
  ]);
  await crowdSale.waitForDeployment();
  console.log(`Crowdsale deployed to ${crowdSale.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
