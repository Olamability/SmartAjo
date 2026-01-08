import { Router, Request, Response } from 'express';
import { successResponse } from '../lib/apiResponse.js';

const router = Router();

// List transactions
router.get('/', async (_req: Request, res: Response) => {
  // TODO: Implement transactions listing
  return res.json(successResponse([], 'Transactions retrieved'));
});

export default router;
