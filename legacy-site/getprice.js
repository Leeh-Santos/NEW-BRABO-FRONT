import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.8.0/+esm';

import { CONTRACT, FUNDME_ABI } from './constants.js';

window.getQuoteSimple = async function(ethAmount) {
    // Setup providers
    const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    //const anvilProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    const quoter = new ethers.Contract(
        "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a", // Base Quoter
        [{
            "inputs": [{"components": [
                {"name": "tokenIn", "type": "address"},
                {"name": "tokenOut", "type": "address"},
                {"name": "amountIn", "type": "uint256"},
                {"name": "fee", "type": "uint24"},
                {"name": "sqrtPriceLimitX96", "type": "uint160"}
            ], "name": "params", "type": "tuple"}],
            "name": "quoteExactInputSingle",
            "outputs": [
                {"name": "amountOut", "type": "uint256"},
                {"name": "sqrtPriceX96After", "type": "uint160"},
                {"name": "initializedTicksCrossed", "type": "uint32"},
                {"name": "gasEstimate", "type": "uint256"}
            ],
            "type": "function"
        }],
        baseProvider
    );

    // Create contract instance for getLP contract on Base
    const getLPContract = new ethers.Contract(CONTRACT, FUNDME_ABI, baseProvider);
    // Split ETH amount: 20% for buyback, 80% for compensation batch
    const totalEthWei = ethers.parseEther(String(ethAmount));
    const buybackAmount = (totalEthWei * 20n) / 100n;  // 20% for swap
    const batchAllocation = totalEthWei - buybackAmount;  // 80% for compensation

    // Get quote for the 20% buyback portion
    const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: "0x4200000000000000000000000000000000000006", // WETH
        tokenOut: "0x07f6A4932e8be5Be7a0aC1bfCAB5EF6b95B0b1a2", // PICA
        amountIn: buybackAmount,  // Use only 20% for swap quote
        fee: 3000,
        sqrtPriceLimitX96: 0
    });

    // Call getPicaPerWeth() from the contract
    const picaPerWeth = await getLPContract.getPicaPerWeth();
    // Calculate compensation similar to Solidity: (getPicaPerWeth() * batchAllocation) / 1e18
    const compensation = (picaPerWeth * batchAllocation) / ethers.parseEther("1");

    const totalPica = result.amountOut + compensation;

    console.log(`For ${ethAmount} ETH:
    - PICA from 20% buyback: ${ethers.formatUnits(result.amountOut, 18)}
    - PICA from 80% batch allocation: ${ethers.formatUnits(compensation, 18)}
    - Total PICA to receive: ${ethers.formatUnits(totalPica, 18)}`);

    return {
        swapOutput: result.amountOut,           // PICA from 20% buyback
        compensation: compensation,              // PICA from 80% batch allocation
        totalPica: totalPica,                   // Total PICA to receive
        buybackEth: buybackAmount,              // ETH used for swap (20%)
        reservedEth: batchAllocation            // ETH reserved (80%)
    };
}
