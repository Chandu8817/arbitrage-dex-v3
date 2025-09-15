import { ethers } from 'ethers';
import { Token, TradeType, Percent, CurrencyAmount } from '@uniswap/sdk-core';
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { Token as UniswapToken } from '@uniswap/sdk-core';
import { Pool, Route } from '@uniswap/v3-sdk';
import { FeeAmount } from '@uniswap/v3-sdk';
import config from '../config';
import logger from '../utils/logger';

// token addresses of ethereum mainnet
const TOKEN_ADDRESSES: Record<string, string> = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
};

const TOKEN_DECIMALS: Record<string, number> = {
  WETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WBTC: 8,
};

const DEX_ROUTERS: Record<string, string> = {
  UNISWAP_V3: config.uniswapV3Router,
  SUSHISWAP_V3: config.sushiswapV3Router,
};

class Web3Service {
  private provider: ethers.providers.JsonRpcProvider;
  private router: AlphaRouter;

  constructor(rpcUrl: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.router = new AlphaRouter({ chainId: 1, provider: this.provider });
  }

  public async getTokenDetails(tokenAddress: string): Promise<{ symbol: string; decimals: number; name: string }> {
    try {
      const tokenSymbol = Object.entries(TOKEN_ADDRESSES).find(
        ([_, addr]) => addr.toLowerCase() === tokenAddress.toLowerCase()
      )?.[0];

      if (tokenSymbol) {
        return {
          symbol: tokenSymbol,
          decimals: TOKEN_DECIMALS[tokenSymbol] || 18,
          name: tokenSymbol,
        };
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function name() view returns (string)',
        ],
        this.provider
      );

      const [symbol, decimals, name] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.name(),
      ]);

      return { symbol, decimals, name };
    } catch (error: any) {
      logger.error(`Error fetching token details: ${error}`);
      throw new Error(`Failed to get token details: ${error.message}`);
    }
  }

  public async findBestTrade(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string,
    dex: 'UNISWAP_V3' | 'SUSHISWAP_V3' = 'UNISWAP_V3'
  ) {
    try {
      const routerAddress = DEX_ROUTERS[dex];
      if (!routerAddress) {
        throw new Error(`Unsupported DEX: ${dex}`);
      }

      const tokenInDetails = await this.getTokenDetails(tokenInAddress);
      const tokenOutDetails = await this.getTokenDetails(tokenOutAddress);

      const tokenIn = new UniswapToken(
        1, // chainId Ethereum 
        tokenInAddress,
        tokenInDetails.decimals,
        tokenInDetails.symbol,
        tokenInDetails.name
      );

      const tokenOut = new UniswapToken(
        1, // chainId Ethereum
        tokenOutAddress,
        tokenOutDetails.decimals,
        tokenOutDetails.symbol,
        tokenOutDetails.name
      );

  
      const amountInWei = ethers.utils.parseUnits(amountIn, tokenInDetails.decimals);
      const currencyAmount = CurrencyAmount.fromRawAmount(tokenIn, amountInWei.toString());

      const route = await this.router.route(
        currencyAmount,
        tokenOut,
        TradeType.EXACT_INPUT,
        {
          recipient: ethers.constants.AddressZero, // We are just getting a quote, not executing
          slippageTolerance: new Percent(50, 10_000), // 0.5%
          deadline: Math.floor(Date.now() / 1000 + 1800), // 30 minutes from now
          type: SwapType.SWAP_ROUTER_02,
        }
      );

      if (!route) {
        throw new Error('No route found');
      }

      return {
        amountOut: route.quote.toExact(),
        gasEstimate: route.estimatedGasUsed.toString(),
        route: route.route[0].tokenPath.map(t => t.symbol).join(' -> '),
        priceImpact: 'priceImpact' in route ? (route as any).priceImpact?.toSignificant?.(6) : '0',
        trade: route,
      };
    } catch (error: any) {
      logger.error(`Error finding best trade: ${error}`);
      throw new Error(`Failed to find best trade: ${error.message}`);
    }
  }

  public async getAdjustedGasPrice(): Promise<ethers.BigNumber> {
    try {
      const gasPrice = await this.provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(ethers.BigNumber.from(Math.floor(config.gasPriceMultiplier * 100))).div(100);
      
     
      const maxGasPrice = ethers.utils.parseUnits(config.maxGasPriceGwei.toString(), 'gwei');
      return adjustedGasPrice.gt(maxGasPrice) ? maxGasPrice : adjustedGasPrice;
    } catch (error: any) {
      logger.error(`Error getting gas price: ${error}`);
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  public async findArbitrageOpportunity(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string
  ) {
    try {
    
      const wethToUsdc = await this.findBestTrade(
        tokenInAddress, // WETH
        tokenOutAddress, // USDC
        '1', // 1 WETH
        'UNISWAP_V3'
      );
      
  
      const usdcToWeth = await this.findBestTrade(
        tokenOutAddress, 
        tokenInAddress, 
        wethToUsdc.amountOut, 
        'SUSHISWAP_V3'
      );
      
      const initialAmount = parseFloat(amountIn); 
      const finalAmount = parseFloat(usdcToWeth.amountOut); 
      
      const gasPrice = await this.getAdjustedGasPrice();
      const gasCostEth = parseFloat(ethers.utils.formatEther(
        gasPrice.mul(ethers.BigNumber.from(wethToUsdc.gasEstimate).add(usdcToWeth.gasEstimate))
      ));

      const ethPriceUsd = 4000;  // just for example we can use oracle for price
      const gasCostUsd = gasCostEth * ethPriceUsd;

      const profit = finalAmount - initialAmount;
      const roi = (profit / initialAmount) * 100;

      return {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn: initialAmount,
        amountOutUni: parseFloat(wethToUsdc.amountOut),
        amountOutSushi: finalAmount,
        profit,
        roi,
        gasCostEth,
        gasCostUsd,
        netProfit: (profit * ethPriceUsd) - gasCostUsd,
        routes: {
          uni: wethToUsdc.route,
          sushi: usdcToWeth.route,
        },
        isProfitable: roi > (config.minProfitThreshold / 100)
      };
    } catch (error) {
      logger.error(`Error finding arbitrage opportunity: ${error}`);
      return null;
    }
  }
}

export default Web3Service;
