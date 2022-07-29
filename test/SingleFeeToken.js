const { expect } = require("chai");
const { providers } = require("ethers");
const { ethers } = require("hardhat");

describe("Single Fee Token", function () {

  let deployer
  let user1
  let feeWallet
  let router
  let token
  let deadline

  it("Test", async function () {
    console.log("## Token Setup")
    await token.connect(deployer).setFeeActive(true)
    await token.connect(deployer).setMinTokensBeforeSwap("1")

    console.log("")

    console.log("## Add Liquidity")
    await token.connect(deployer).approve(router.address, ethers.utils.parseEther("1000"))
    console.log("Balance: " + await token.balanceOf(deployer.address))
    await router.connect(deployer).addLiquidityETH(
      token.address,
      ethers.utils.parseEther("1000"),
      "0",
      "0",
      deployer.address,
      deadline,
      {value: ethers.utils.parseEther("1.0")}
    )

    console.log("")

    console.log("## Some swaps")

    console.log("We buy")
    await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      "0",
      [await router.WETH(), token.address],
      user1.address,
      deadline,
      {value: ethers.utils.parseEther("0.05")}
      )
    
    console.log("Then we sell")
    await token.connect(user1).approve(router.address, ethers.utils.parseEther("10"))
    await router.connect(user1).swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("10"),
      0,
      [token.address, await router.WETH()],
      user1.address,
      deadline
    );

    console.log("")

    console.log("## Results")

    console.log("Tokens in contract: " + ethers.utils.formatEther(await token.balanceOf(token.address)))
    console.log("Fee wallet token balance: " + ethers.utils.formatEther(await ethers.provider.getBalance(feeWallet.address)))
  });

  beforeEach(async function () {
    [deployer, user1, feeWallet] = await ethers.getSigners();

    const DummyRouter = await hre.ethers.getContractFactory("DummyRouter")
    const SingleFeeToken = await hre.ethers.getContractFactory("SingleFeeToken")

    /*
    Router Contracts
    Uniswap (mainnet):    0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    Quickswap (polygon):  0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
    Pancakeswap (bsc):    0x10ED43C718714eb63d5aA57B78B54704E256024E
    */

    router = await DummyRouter.attach("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")
    token = await SingleFeeToken.deploy(router.address, feeWallet.address)

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    deadline = blockBefore.timestamp + 500;
  })
});