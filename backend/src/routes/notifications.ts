import { Router, Request, Response } from 'express';
import { successResponse } from '../lib/apiResponse.js';

const router = Router();

// List notifications
router.get('/', async (_req: Request, res: Response) => {
  // TODO: Implement notifications listing
  return res.json(successResponse([], 'Notifications retrieved'));
});

// Mark notification as read
router.post('/:id/read', async (req: Request, res: Response) => {
  // TODO: Implement mark as read
  return res.json(successResponse({}, 'Notification marked as read'));
});

export default router;
