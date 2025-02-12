"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkArbitrage = checkArbitrage;
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const PARA_SWAP_API = "https://api.paraswap.io/prices";
// Função para verificar se uma string é um TokenSymbol válido
function isTokenSymbol(symbol) {
    return Object.keys(TOKENS).includes(symbol);
}
// Endereços dos contratos na Polygon
const TOKENS = {
    MATIC: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
    WMATIC: { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
    USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
    WETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
    QUICK: { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", decimals: 18 },
    SUSHI: { address: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", decimals: 18 },
    AAVE: { address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", decimals: 18 },
    LINK: { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", decimals: 18 },
    WBTC: { address: "0x1BFD67037B42Cf73acf2047067bd4F2C47D9BfD6", decimals: 8 },
    CRV: { address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF", decimals: 18 },
    BAL: { address: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", decimals: 18 },
    GHST: { address: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7", decimals: 18 },
    DPI: { address: "0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369", decimals: 18 }
};
async function getBestPrice(srcToken, destToken, amount) {
    try {
        const decimalsSrc = TOKENS[srcToken].decimals;
        const weiAmount = ethers_1.ethers.parseUnits(amount.toString(), decimalsSrc).toString();
        const response = await axios_1.default.get(PARA_SWAP_API, {
            params: {
                srcToken: TOKENS[srcToken].address,
                destToken: TOKENS[destToken].address,
                amount: weiAmount,
                side: "SELL",
                network: 137,
                partner: "coolcline",
                includeDEXS: true,
                excludeDEXS: [],
                excludeContractMethods: [],
            }
        });
        if (!response.data?.priceRoute || response.data.priceRoute.maxImpactReached) {
            return null;
        }
        const priceRoute = response.data.priceRoute;
        const decimalsDest = TOKENS[destToken].decimals;
        const normalizedAmount = Number(ethers_1.ethers.formatUnits(priceRoute.destAmount, decimalsDest));
        const result = {
            amount: normalizedAmount,
            dex: priceRoute.bestRoute[0]?.swaps[0]?.swapExchanges[0]?.exchange || "Unknown"
        };
        return result;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao obter preço ${srcToken} → ${destToken}:`, errorMessage);
        return null;
    }
}
async function checkArbitrage() {
    console.log("Checking arbitrage opportunities...");
    const tokensIntermediarios = Object.keys(TOKENS).filter(symbol => symbol !== 'USDC');
    for (const tokenIntermediario of tokensIntermediarios) {
        if (!isTokenSymbol(tokenIntermediario))
            continue;
        console.log(`Verifying route: USDC -> ${tokenIntermediario} -> USDC`);
        const step1 = await getBestPrice("USDC", tokenIntermediario, 1);
        if (!step1) {
            console.log(`Failed to get price USDC -> ${tokenIntermediario}`);
            continue;
        }
        const step2 = await getBestPrice(tokenIntermediario, "USDC", step1.amount);
        if (!step2) {
            console.log(`Failed to get price ${tokenIntermediario} -> USDC`);
            continue;
        }
        const profit = step2.amount - 1;
        console.log(`Potential profit: ${profit}, DEX1: ${step1.dex}, DEX2: ${step2.dex}`);
    }
}
