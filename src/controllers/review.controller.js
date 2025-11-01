/**
 * Review Controller
 * Handles manual review requests
 */
const reviewService = require('../services/review.service');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

class ReviewController {
  /**
   * Trigger manual review
   */
  async triggerReview(req, res) {
    const { projectId, mrIid } = req.body;

    if (!projectId || !mrIid) {
      throw new ValidationError('projectId and mrIid are required');
    }

    logger.info('Manual review triggered', {
      projectId,
      mrIid,
      user: req.user,
    });

    // Start review async
    reviewService
      .reviewMergeRequest(projectId, mrIid)
      .then(() => {
        logger.info('Manual review completed', { projectId, mrIid });
      })
      .catch((error) => {
        logger.error('Manual review failed', {
          projectId,
          mrIid,
          error: error.message,
        });
      });

    // Respond immediately
    res.json({
      success: true,
      message: 'Review started',
      projectId,
      mrIid,
    });
  }

  /**
   * Get review status (placeholder for future implementation)
   */
  async getReviewStatus(req, res) {
    const { projectId, mrIid } = req.params;

    res.json({
      projectId,
      mrIid,
      status: 'not_implemented',
      message: 'Status tracking coming soon',
    });
  }
}

module.exports = new ReviewController();
