import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.8.0/+esm';
import { CONTRACT_ADDRESSES, FUNDME_ABI } from './constants.js';


//const anvilProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const fundMeContract = new ethers.Contract(CONTRACT_ADDRESSES.FUNDME, FUNDME_ABI, baseProvider);


console.log("Fetching pool address and price data...\n");

// Get pool address
const poolAddress = await fundMeContract.picaEthPool();
console.log("Pool Address:", poolAddress);

// Get prices from both functions
const wethPerPica = await fundMeContract.getWethPerPica();
const picaPerWeth = await fundMeContract.getPicaPerWeth();

console.log("\n=== Contract Functions ===");
console.log("getWethPerPica():", ethers.formatUnits(wethPerPica, 18), "WETH per PICA");
console.log("getPicaPerWeth():", ethers.formatUnits(picaPerWeth, 18), "PICA per WETH");

// Calculate price per PICA in ETH
const priceFromDirect = parseFloat(ethers.formatUnits(wethPerPica, 18));
const priceFromInverse = 1 / parseFloat(ethers.formatUnits(picaPerWeth, 18));

console.log("\n=== Calculated Prices ===");
console.log("Using getWethPerPica() directly:", priceFromDirect, "ETH per PICA");
console.log("Using getPicaPerWeth() inverted:", priceFromInverse, "ETH per PICA");

// Get ETH price in USD
const ethPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
const ethPriceData = await ethPriceResponse.json();
const ethPriceUSD = ethPriceData.ethereum.usd;

console.log("\n=== USD Prices ===");
console.log("ETH Price: $" + ethPriceUSD);
console.log("PICA from getWethPerPica(): $" + (priceFromDirect * ethPriceUSD).toFixed(8));
console.log("PICA from inverted getPicaPerWeth(): $" + (priceFromInverse * ethPriceUSD).toFixed(8));
console.log("\nDEX Screener shows: $0.001626");
