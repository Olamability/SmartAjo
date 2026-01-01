const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { apiLimiter, readLimiter } = require('../middleware/rateLimiter');
const groupController = require('../controllers/groupController');

// Protected routes - require authentication and rate limiting
router.post('/', authenticate, apiLimiter, groupController.createGroup);
router.get('/my-groups', authenticate, readLimiter, groupController.getMyGroups);
router.get('/available', authenticate, readLimiter, groupController.getAvailableGroups);
router.get('/:id', authenticate, readLimiter, groupController.getGroupById);
router.post('/:id/join', authenticate, apiLimiter, groupController.joinGroup);

module.exports = router;
