import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './config';
import logger, { morganStream } from './utils/logger';
import db from './database/connection';
import Web3Service from './services/Web3Service';
import arbitrageRouter from './api/routes/arbitrage.routes';
import ArbitrageOpportunity from './database/models/ArbitrageOpportunity';
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: morganStream }));

app.get('api/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
app.use('/api/arbitrage', arbitrageRouter);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

const web3Service = new Web3Service(config.mainnetRpcUrl);
io.on('connection', (socket) => {
  logger.info('New client connected');
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });

  socket.on('subscribe_opportunities', () => {
    logger.info('Client subscribed to arbitrage opportunities');
  });
});

const PORT = config.port;
const HOST = config.host;

const startServer = async () => {
  try {
    await db.connect();
    
    httpServer.listen(PORT, HOST, () => {
      logger.info(`Server is running on http://${HOST}:${PORT}`);
      
      startArbitrageMonitor();
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

const startArbitrageMonitor = async () => {
  logger.info('Starting arbitrage monitor...');
  
  setInterval(async () => {
    try {
      // Check for arbitrage between WETH and USDC
      const opportunity = await web3Service.findArbitrageOpportunity(
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '1' // 1 WETH
      );

      if (opportunity) {
        logger.info(`Arbitrage opportunity found - ROI: ${opportunity.roi.toFixed(2)}%`);
        
        // Save to database
        const dbOpportunity = new ArbitrageOpportunity({
          tokenIn: opportunity.tokenIn,
          tokenOut: opportunity.tokenOut,
          buyDex: 'UNISWAP_V3',
          sellDex: 'SUSHISWAP_V3',
          buyPrice: opportunity.amountOutUni / opportunity.amountIn,
          sellPrice: opportunity.amountOutSushi / opportunity.amountIn,
          amountIn: opportunity.amountIn,
          expectedAmountOut: opportunity.amountOutSushi,
          buyFee: 0.003, 
          sellFee: 0.003, 
          gasCostEth: opportunity.gasCostEth,
          gasCostUsd: opportunity.gasCostUsd,
          grossProfit: opportunity.profit,
          netProfit: opportunity.netProfit,
          roi: opportunity.roi,
          status: 'simulated',
          metadata: {
            routes: opportunity.routes,
            isProfitable: opportunity.isProfitable
          }
        });

        await dbOpportunity.save();
        logger.info(`Opportunity saved to database with ID: ${dbOpportunity._id}`);
        
        // Emit to connected clients
        io.emit('arbitrage_opportunity', opportunity);
      } else {
        logger.info('No arbitrage opportunity found');
      }

    } catch (error) {
      logger.error(`Error in arbitrage monitor: ${error}`);
    }
  }, 30000); // Check every 30 seconds
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
startServer();

export { app, httpServer };
