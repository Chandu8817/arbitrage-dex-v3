import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import ArbitrageOpportunity from '../../database/models/ArbitrageOpportunity';
import Web3Service from '../../services/Web3Service';
import logger from '../../utils/logger';
import config from '../../config';
import {Request, Response} from 'express';

const router = Router();
const web3Service = new Web3Service(config.mainnetRpcUrl);

router.get('/opportunities', async (req, res) => {
  try {
    const { limit = '10', page = '1', token } = req.query;
    const query: any = {};
    
    if (token) {
      query.$or = [
        { tokenIn: token },
        { tokenOut: token },
      ];
    }
    
    const opportunities = await ArbitrageOpportunity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string, 10))
      .skip((parseInt(page as string, 10) - 1) * parseInt(limit as string, 10));
    
    const total = await ArbitrageOpportunity.countDocuments(query);
    
    res.json({
      data: opportunities,
      meta: {
        total,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        pages: Math.ceil(total / parseInt(limit as string, 10)),
      },
    });
  } catch (error) {
    logger.error(`Error fetching opportunities: ${error}`);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

router.get('/opportunities/:id', [
  param('id').isMongoId().withMessage('Invalid opportunity ID'),
  validateRequest,
], async (req: Request, res: Response) => {
  try {
    const opportunity = await ArbitrageOpportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    res.json(opportunity);
  } catch (error) {
    logger.error(`Error fetching opportunity ${req.params.id}: ${error}`);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

router.post('/check', [
  body('tokenIn').isString().notEmpty().withMessage('Token In address is required'),
  body('tokenOut').isString().notEmpty().withMessage('Token Out address is required'),
  body('amountIn').isString().notEmpty().withMessage('Amount In is required'),
  validateRequest,
], async (req: Request, res: Response) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.body;
    
    const opportunity = await web3Service.findArbitrageOpportunity(
      tokenIn,
      tokenOut,
      amountIn
    );
    
    if (!opportunity) {
      return res.status(404).json({ message: 'No arbitrage opportunity found' });
    }

    const savedOpportunity = new ArbitrageOpportunity({
      tokenIn: opportunity.tokenIn,
      tokenOut: opportunity.tokenOut,
      amountIn: opportunity.amountIn,
      expectedAmountOut: opportunity.amountOutSushi,
      buyDex: 'UNISWAP_V3',
      sellDex: 'SUSHISWAP_V3',
      buyPrice: 0,
      sellPrice: 0,
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
        timestamp: new Date().toISOString()
      }
    });
    
    await savedOpportunity.save();
    
    res.json({
      message: 'Arbitrage opportunity found',
      data: opportunity,
    });
  } catch (error) {
    logger.error(`Error checking for arbitrage: ${error}`);
    res.status(500).json({ error: 'Failed to check for arbitrage' });
  }
});

router.get('/tokens', (req, res) => {
  res.json({
    data: [
      { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
      { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    ],
  });
});

export default router;
