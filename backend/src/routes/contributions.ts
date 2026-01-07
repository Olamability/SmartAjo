import { Router, Request, Response } from 'express';
import { successResponse } from '../lib/apiResponse.js';

const router = Router();

// List contributions
router.get('/', async (_req: Request, res: Response) => {
  // TODO: Implement contributions listing
  return res.json(successResponse([], 'Contributions retrieved'));
});

// Create contribution
router.post('/', async (_req: Request, res: Response) => {
  // TODO: Implement create contribution
  return res.json(successResponse({}, 'Contribution created'));
});

export default router;
