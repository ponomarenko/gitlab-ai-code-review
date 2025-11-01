/**
 * API Routes
 */
const express = require('express');
const reviewController = require('../controllers/review.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Manual review trigger (protected)
router.post('/review', authMiddleware, reviewController.triggerReview);

// Get review status
router.get('/review/:projectId/:mrIid', reviewController.getReviewStatus);

module.exports = router;
