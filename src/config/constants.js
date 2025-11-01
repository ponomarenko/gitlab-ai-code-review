/**
 * Application constants
 */

module.exports = {
  // File size limits
  MAX_FILE_SIZE_MB: 5,
  MAX_DIFF_LINES: 1000,

  // Review severity levels
  SEVERITY: {
    CRITICAL: 'critical',
    MAJOR: 'major',
    MINOR: 'minor',
    INFO: 'info',
  },

  // Review categories
  CATEGORIES: {
    BUG: 'bug',
    SECURITY: 'security',
    PERFORMANCE: 'performance',
    QUALITY: 'quality',
    BEST_PRACTICE: 'best_practice',
    TESTING: 'testing',
    DOCUMENTATION: 'documentation',
  },

  // Commit status states
  COMMIT_STATUS: {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
  },

  // MR actions to process
  MR_ACTIONS: ['open', 'update', 'reopen'],

  // Emojis for reactions
  EMOJIS: {
    SUCCESS: 'white_check_mark',
    ROBOT: 'robot_face',
    WARNING: 'warning',
    ERROR: 'x',
  },

  // HTTP timeouts
  TIMEOUTS: {
    GITLAB_API: 30000,
    DIFY_API: 60000,
  },
};
