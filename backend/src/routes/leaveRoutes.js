const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/balance', authenticate, leaveController.getBalance);
router.post('/apply', authenticate, leaveController.apply);
router.get('/', authenticate, leaveController.list);
router.patch('/:id/review', authenticate, authorize('HR'), leaveController.review);
router.patch('/:id/cancel', authenticate, leaveController.cancel);

module.exports = router;

