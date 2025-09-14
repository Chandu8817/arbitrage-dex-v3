import { Schema, model, Document } from 'mongoose';

export interface IArbitrageOpportunity extends Document {
  timestamp: Date;
  tokenIn: string;
  tokenOut: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  amountIn: number;
  expectedAmountOut: number;
  buyFee: number;
  sellFee: number;
  gasCostEth: number;
  gasCostUsd: number;
  grossProfit: number;
  netProfit: number;
  roi: number;
  blockNumber?: number;
  txHash?: string;
  status: 'simulated' | 'executed' | 'failed';
  metadata?: Record<string, any>;
}

const ArbitrageOpportunitySchema = new Schema<IArbitrageOpportunity>(
  {
    timestamp: { type: Date, default: Date.now },
    tokenIn: { type: String, required: true },
    tokenOut: { type: String, required: true },
    buyDex: { type: String, required: true },
    sellDex: { type: String, required: true },
    buyPrice: { type: Number, required: true },
    sellPrice: { type: Number, required: true },
    amountIn: { type: Number, required: true },
    expectedAmountOut: { type: Number, required: true },
    buyFee: { type: Number, required: true },
    sellFee: { type: Number, required: true },
    gasCostEth: { type: Number, required: true },
    gasCostUsd: { type: Number, required: true },
    grossProfit: { type: Number, required: true },
    netProfit: { type: Number, required: true },
    roi: { type: Number, required: true },
    blockNumber: { type: Number },
    txHash: { type: String },
    status: { 
      type: String, 
      enum: ['simulated', 'executed', 'failed'], 
      default: 'simulated' 
    },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);


ArbitrageOpportunitySchema.index({ tokenIn: 1, tokenOut: 1 });
ArbitrageOpportunitySchema.index({ status: 1 });
ArbitrageOpportunitySchema.index({ timestamp: -1 });

export default model<IArbitrageOpportunity>('ArbitrageOpportunity', ArbitrageOpportunitySchema);
