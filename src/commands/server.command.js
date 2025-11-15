/**
 * Server Command
 * Starts the webhook server
 */

const logger = require('../utils/logger');

module.exports = async (options) => {
  try {
    logger.info('Starting server...', {
      port: options.port,
      host: options.host,
      environment: process.env.NODE_ENV,
    });

    // Override port if specified
    if (options.port) {
      process.env.PORT = options.port;
    }

    // Start the main application
    // eslint-disable-next-line global-require
    require('../app');

    logger.info('Server started successfully');
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};
