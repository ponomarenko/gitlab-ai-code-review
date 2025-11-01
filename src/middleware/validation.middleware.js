/**
 * Request validation middleware
 */
const config = require('../config');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

/**
 * Validate GitLab webhook signature
 */
function validateWebhook(req, res, next) {
  // If no secret configured, skip validation
  if (!config.gitlab.webhookSecret) {
    logger.warn('Webhook secret not configured - skipping validation');
    return next();
  }

  const signature = req.headers['x-gitlab-token'];

  if (!signature) {
    throw new ValidationError('Missing webhook signature');
  }

  if (signature !== config.gitlab.webhookSecret) {
    logger.error('Invalid webhook signature', {
      received: `${signature?.substring(0, 10)}...`,
    });
    throw new ValidationError('Invalid webhook signature');
  }

  next();
}

/**
 * Validate request body
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    req.body = value;
    next();
  };
}

module.exports = {
  validateWebhook,
  validateBody,
};
