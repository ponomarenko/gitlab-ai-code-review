/**
 * Helper utility functions
 */

/**
 * Delay execution
 * @param {number} ms - Milliseconds to wait
 */
// eslint-disable-next-line no-promise-executor-return
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < maxRetries; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delayMs = baseDelay * 2 ** i;
        // eslint-disable-next-line no-await-in-loop
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 */
function truncate(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Parse webhook signature
 * @param {string} signature - Webhook signature
 * @param {string} payload - Request payload
 * @param {string} secret - Webhook secret
 */
function verifyWebhookSignature(signature, payload, secret) {
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === digest;
}

/**
 * Sanitize error for logging (remove sensitive data)
 * @param {Error} error - Error object
 */
function sanitizeError(error) {
  const sanitized = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Remove sensitive headers, tokens, etc.
  if (error.config) {
    sanitized.config = {
      url: error.config.url,
      method: error.config.method,
    };
  }

  return sanitized;
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 */
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  delay,
  retry,
  truncate,
  verifyWebhookSignature,
  sanitizeError,
  formatDuration,
  chunk,
};
