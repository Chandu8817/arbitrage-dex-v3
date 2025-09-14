import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import logger from '../utils/logger';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  
  next();
};

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array(),
    });
  };
};
