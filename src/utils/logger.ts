import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  let logMessage = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta, null, 2)}`;
  }
  
  return logMessage;
});

const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
  exitOnError: false
});

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export { stream as morganStream };
export default logger;
