import mongoose from 'mongoose';
import logger from '../utils/logger';
import config from '../config';

class Database {
  private static instance: Database;
  public isConnected = false;

  private constructor() {
    this.connect();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Using existing database connection');
      return;
    }

    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });

      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
        this.isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err}`);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      });
    } catch (error) {
      logger.error(`MongoDB connection error: ${error}`);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error(`Error disconnecting from MongoDB: ${error}`);
    }
  }
}

export default Database.getInstance();
