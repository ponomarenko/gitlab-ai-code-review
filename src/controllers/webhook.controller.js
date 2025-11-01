/**
 * Webhook Controller
 * Handles GitLab webhook events
 */
const reviewService = require('../services/review.service');
const logger = require('../utils/logger');

class WebhookController {
  /**
   * Handle GitLab webhook
   */
  async handleGitLabWebhook(req, res) {
    const event = req.body;
    const eventType = req.headers['x-gitlab-event'];

    logger.info('Webhook received', {
      eventType,
      objectKind: event.object_kind,
    });

    // Only process merge request events
    if (event.object_kind !== 'merge_request') {
      return res.json({ message: 'Event type not supported' });
    }

    const action = event.object_attributes?.action;

    // Respond to open, update, and reopen actions
    if (!['open', 'update', 'reopen'].includes(action)) {
      return res.json({ message: 'MR action not relevant' });
    }

    const projectId = event.project?.id;
    const mrIid = event.object_attributes?.iid;

    if (!projectId || !mrIid) {
      logger.warn('Missing project ID or MR IID', { event });
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Start review asynchronously
    reviewService
      .reviewMergeRequest(projectId, mrIid)
      .then(() => {
        logger.info('Webhook review completed', { projectId, mrIid });
      })
      .catch((error) => {
        logger.error('Webhook review failed', {
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
}

module.exports = new WebhookController();
