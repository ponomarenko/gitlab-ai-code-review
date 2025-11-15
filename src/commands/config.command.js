/**
 * Config Command
 * Display and validate configuration
 */

const logger = require('../utils/logger');
const config = require('../config');

function maskSensitive(value) {
  if (!value) return null;
  const str = String(value);
  if (str.length <= 8) return '***';
  return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
}

function getSafeConfig() {
  return {
    environment: config.env,
    port: config.port,
    logLevel: config.logLevel,
    gitlab: {
      url: config.gitlab.url,
      token: maskSensitive(config.gitlab.token),
      webhookSecret: config.gitlab.webhookSecret ? '***' : null,
    },
    dify: {
      apiUrl: config.dify.apiUrl,
      apiKey: maskSensitive(config.dify.apiKey),
      user: config.dify.user,
    },
    review: {
      maxFilesPerReview: config.review.maxFilesPerReview,
      maxDiffSize: config.review.maxDiffSize,
      enableInlineComments: config.review.enableInlineComments,
      skipPatterns: config.review.skipPatterns,
    },
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
    },
    rag: {
      enabled: config.rag.enabled,
      knowledgeBase: config.rag.knowledgeBase,
    },
    cors: {
      origin: config.cors.origin,
    },
  };
}

module.exports = async (options) => {
  try {
    const safeConfig = getSafeConfig();

    if (options.validate) {
      logger.info('Configuration is valid');
      process.exit(0);
    }

    if (options.json) {
      console.log(JSON.stringify(safeConfig, null, 2));
    } else {
      console.log('\n=== GitLab AI Code Review Configuration ===\n');
      console.log(`Environment: ${safeConfig.environment}`);
      console.log(`Port: ${safeConfig.port}`);
      console.log(`Log Level: ${safeConfig.logLevel}`);
      console.log('\nGitLab:');
      console.log(`  URL: ${safeConfig.gitlab.url}`);
      console.log(`  Token: ${safeConfig.gitlab.token}`);
      console.log(`  Webhook Secret: ${safeConfig.gitlab.webhookSecret || 'Not set'}`);
      console.log('\nDify:');
      console.log(`  API URL: ${safeConfig.dify.apiUrl}`);
      console.log(`  API Key: ${safeConfig.dify.apiKey}`);
      console.log(`  User: ${safeConfig.dify.user}`);
      console.log('\nReview Settings:');
      console.log(`  Max Files: ${safeConfig.review.maxFilesPerReview}`);
      console.log(`  Max Diff Size: ${safeConfig.review.maxDiffSize}`);
      console.log(`  Inline Comments: ${safeConfig.review.enableInlineComments}`);
      console.log(`  Skip Patterns: ${safeConfig.review.skipPatterns.join(', ')}`);
      console.log('\nRAG:');
      console.log(`  Enabled: ${safeConfig.rag.enabled}`);
      console.log(`  Knowledge Base: ${safeConfig.rag.knowledgeBase}`);
      console.log('\nRate Limiting:');
      console.log(`  Window: ${safeConfig.rateLimit.windowMs}ms`);
      console.log(`  Max Requests: ${safeConfig.rateLimit.maxRequests}`);
      console.log('\n');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed to display configuration', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};
