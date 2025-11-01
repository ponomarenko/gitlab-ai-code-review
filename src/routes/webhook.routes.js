/**
 * Webhook routes
 */
const express = require('express');
const webhookController = require('../controllers/webhook.controller');
const { validateWebhook } = require('../middleware/validation.middleware');

const router = express.Router();

// GitLab webhook endpoint
router.post('/gitlab', validateWebhook, webhookController.handleGitLabWebhook);

module.exports = router;
