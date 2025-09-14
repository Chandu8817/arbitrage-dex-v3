import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface IConfig {
  nodeEnv: string;
  port: number;
  host: string;
  
  mainnetRpcUrl: string;
  arbitrumRpcUrl: string;
  optimismRpcUrl: string;
  
  uniswapV3Router: string;
  sushiswapV3Router: string;
  
  mongoUri: string;
  
  gasPriceMultiplier: number;
  maxGasPriceGwei: number;
  
  minProfitThreshold: number;
  
  logLevel: string;
}

const config: IConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  mainnetRpcUrl: process.env.MAINNET_RPC_URL || '',
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || '',
  optimismRpcUrl: process.env.OPTIMISM_RPC_URL || '',
  
  uniswapV3Router: process.env.UNISWAP_V3_ROUTER || '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  sushiswapV3Router: process.env.SUSHISWAP_V3_ROUTER || '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/arbitrage-bot',
  
  gasPriceMultiplier: parseFloat(process.env.GAS_PRICE_MULTIPLIER || '1.2'),
  maxGasPriceGwei: parseFloat(process.env.MAX_GAS_PRICE_GWEI || '100'),
  

  minProfitThreshold: parseInt(process.env.MIN_PROFIT_THRESHOLD || '30', 10),
  
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
