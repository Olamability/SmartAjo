import { Router, Request, Response } from 'express';
import { successResponse, unauthorizedResponse } from '../lib/apiResponse.js';

const router = Router();

// Daily cron job
router.post('/daily', async (req: Request, res: Response) => {
  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'];
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json(unauthorizedResponse('Unauthorized'));
  }

  // TODO: Implement daily cron tasks
  return res.json(successResponse({}, 'Daily cron completed'));
});

export default router;
