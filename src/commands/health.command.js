/**
 * Health Command
 * Check service health and connectivity
 */

const logger = require('../utils/logger');
const gitlabService = require('../services/gitlab.service');
const difyService = require('../services/dify.service');
const config = require('../config');

async function checkGitLab() {
  try {
    const response = await gitlabService.client.get('/user');
    return {
      status: 'healthy',
      user: response.data.username,
      url: config.gitlab.url,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

async function checkDify() {
  try {
    // Simple connectivity check
    await difyService.client.get('/parameters');
    return {
      status: 'healthy',
      url: config.dify.apiUrl,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

module.exports = async (options) => {
  try {
    const checks = {};

    logger.info('Running health checks...');

    // Check GitLab
    if (options.gitlab || options.all) {
      logger.info('Checking GitLab connectivity...');
      checks.gitlab = await checkGitLab();
      logger.info('GitLab check completed', checks.gitlab);
    }

    // Check Dify
    if (options.dify || options.all) {
      logger.info('Checking Dify API connectivity...');
      checks.dify = await checkDify();
      logger.info('Dify check completed', checks.dify);
    }

    // If no specific check requested, check all
    if (!options.gitlab && !options.dify && !options.all) {
      logger.info('Checking all services...');
      checks.gitlab = await checkGitLab();
      checks.dify = await checkDify();
    }

    // Overall health status
    const allHealthy = Object.values(checks).every((check) => check.status === 'healthy');

    const result = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      config: {
        environment: config.env,
        ragEnabled: config.rag.enabled,
        knowledgeBase: config.rag.knowledgeBase,
      },
    };

    console.log(JSON.stringify(result, null, 2));

    process.exit(allHealthy ? 0 : 1);
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};
