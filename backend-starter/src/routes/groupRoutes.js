const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const groupController = require('../controllers/groupController');

// Protected routes - require authentication
router.post('/', authenticate, groupController.createGroup);
router.get('/my-groups', authenticate, groupController.getMyGroups);
router.get('/available', authenticate, groupController.getAvailableGroups);
router.get('/:id', authenticate, groupController.getGroupById);
router.post('/:id/join', authenticate, groupController.joinGroup);

module.exports = router;
