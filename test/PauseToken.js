const { expect } = require("chai");
const { providers } = require("ethers");
const { ethers } = require("hardhat");

describe("Single Fee Token", function () {

  let deployer
  let user1
  let router
  let token
  let deadline

  it("Exempt users can buy and sell", async function () {
    // Token Setup
    await token.connect(deployer).setPaused(true)
    await token.connect(deployer).setPauseExempt(user1.address, true)

    // Let's add liquidity in Uni
    await token.connect(deployer).approve(router.address, ethers.utils.parseEther("1000"))
    await router.connect(deployer).addLiquidityETH(
      token.address,
      ethers.utils.parseEther("1000"),
      "0",
      "0",
      deployer.address,
      deadline,
      {value: ethers.utils.parseEther("1.0")}
    )

    // Now we can buy
    await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      "0",
      [await router.WETH(), token.address],
      user1.address,
      deadline,
      {value: ethers.utils.parseEther("0.05")}
      )
    
    // And sell
    await token.connect(user1).approve(router.address, ethers.utils.parseEther("10"))
    await router.connect(user1).swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("10"),
      0,
      [token.address, await router.WETH()],
      user1.address,
      deadline
    );
  });

  it("Not exempt users cant swap during pause", async function () {
    // Token Setup
    await token.connect(deployer).setPaused(true)

    // Let's add liquidity in Uni
    await token.connect(deployer).approve(router.address, ethers.utils.parseEther("1000"))
    await router.connect(deployer).addLiquidityETH(
      token.address,
      ethers.utils.parseEther("1000"),
      "0",
      "0",
      deployer.address,
      deadline,
      {value: ethers.utils.parseEther("1.0")}
    )

    // During pause, buying from Uni will revert for users that are not exempt
    await expect(
      router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        "0",
        [await router.WETH(), token.address],
        user2.address,
        deadline,
        {value: ethers.utils.parseEther("0.05")}
        )
    ).to.be.revertedWith("UniswapV2: TRANSFER_FAILED");
    
    // Same goes to sell
    await token.connect(user2).approve(router.address, ethers.utils.parseEther("10"))
    await expect(
      router.connect(user2).swapExactTokensForETHSupportingFeeOnTransferTokens(
        ethers.utils.parseEther("10"),
        0,
        [token.address, await router.WETH()],
        user2.address,
        deadline
      )
    ).to.be.revertedWith("TransferHelper: TRANSFER_FROM_FAILED");
  });

  it("Everyone can buy and sell if contract is not paused", async function () {
    // Let's pause the token
    await token.connect(deployer).setPaused(false)

    // Let's add liquidity in Uni
    await token.connect(deployer).approve(router.address, ethers.utils.parseEther("1000"))
    await router.connect(deployer).addLiquidityETH(
      token.address,
      ethers.utils.parseEther("1000"),
      "0",
      "0",
      deployer.address,
      deadline,
      {value: ethers.utils.parseEther("1.0")}
    )

    // If not paused, everyone can buy and sell, let's try with user1
    await router.connect(user1).swapExactETHForTokensSupportingFeeOnTransferTokens(
      "0",
      [await router.WETH(), token.address],
      user1.address,
      deadline,
      {value: ethers.utils.parseEther("0.05")}
      )
    
    await token.connect(user1).approve(router.address, ethers.utils.parseEther("10"))
    await router.connect(user1).swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("10"),
      0,
      [token.address, await router.WETH()],
      user1.address,
      deadline
    );

    // And now for user2
    await router.connect(user2).swapExactETHForTokensSupportingFeeOnTransferTokens(
      "0",
      [await router.WETH(), token.address],
      user2.address,
      deadline,
      {value: ethers.utils.parseEther("0.05")}
      )
    
    await token.connect(user2).approve(router.address, ethers.utils.parseEther("10"))
    await router.connect(user2).swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("10"),
      0,
      [token.address, await router.WETH()],
      user2.address,
      deadline
    );
  });

  it("Constructor values are properly set", async function () {
    expect(await token.name()).to.equal("Test Name");
    expect(await token.symbol()).to.equal("Test Symbol");
    expect(await token.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
  });

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    const DummyRouter = await hre.ethers.getContractFactory("DummyRouter")
    const ERC20Token00 = await hre.ethers.getContractFactory("ERC20Token00")

    /*
    Router Contracts
    Uniswap (mainnet):    0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    Quickswap (polygon):  0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
    Pancakeswap (bsc):    0x10ED43C718714eb63d5aA57B78B54704E256024E
    */

    router = await DummyRouter.attach("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")
    token = await ERC20Token00.deploy("Test Name", "Test Symbol", "1000000")

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    deadline = blockBefore.timestamp + 500;
  })
});