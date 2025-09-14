# DeFi Arbitrage Trading Bot

A Node.js TypeScript application that identifies arbitrage opportunities between Uniswap V3-compatible DEXs.

## Features

- Real-time price monitoring across multiple DEXs
- Arbitrage opportunity detection with profit calculation
- Simulation of trade execution (no real trades)
- REST API for monitoring and managing opportunities
- WebSocket support for real-time updates
- MongoDB for data persistence

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MongoDB (local or cloud instance)
- Ethereum node (e.g., Infura, Alchemy) or public RPC endpoint

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/defi-arbitrage-bot.git
   cd defi-arbitrage-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Copy the example environment file and update the values:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration:
   ```
   NODE_ENV=development
   PORT=3000
   HOST=0.0.0.0
   MAINNET_RPC_URL=your_ethereum_node_url
   MONGODB_URI=mongodb://localhost:27017/arbitrage-bot
   ```

## Usage

1. Start the application in development mode:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. The API will be available at `http://localhost:3000/api`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/arbitrage/opportunities` - Get recent arbitrage opportunities
- `GET /api/arbitrage/opportunities/:id` - Get a specific opportunity by ID
- `POST /api/arbitrage/check` - Check for arbitrage between two tokens
- `GET /api/arbitrage/tokens` - Get list of supported tokens

## WebSocket

The application provides WebSocket support for real-time updates. Connect to `ws://localhost:3000` to receive updates about new arbitrage opportunities.

## Project Structure

```
src/
├── api/                    # API routes and controllers
├── config/                 # Application configuration
├── database/               # Database models and connection
├── middleware/             # Express middleware
├── services/               # Business logic and external services
├── utils/                  # Utility functions
├── index.ts                # Application entry point
```

## Arbitrage Logic

The bot identifies arbitrage opportunities by:
1. Monitoring price differences between the same token pairs on different DEXs
2. Calculating potential profits after accounting for:
   - Trading fees (0.3% for Uniswap V3, varies for other DEXs)
   - Gas costs for executing transactions
   - Slippage (0.5% by default)
3. Only considering opportunities where the net profit exceeds the configured threshold

## Configuration

Edit the `.env` file to configure:
- Network RPC endpoints
- Database connection
- Gas price settings
- Profit thresholds
- Logging levels

## Testing

Run tests with:
```bash
npm test
# or
yarn test
```

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## License

MIT
