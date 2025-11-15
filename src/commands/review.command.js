/**
 * Review Command
 * Manually trigger code review for a merge request
 */

const logger = require('../utils/logger');
const reviewService = require('../services/review.service');
const gitlabService = require('../services/gitlab.service');

module.exports = async (options) => {
  try {
    logger.info('Starting manual code review', {
      project: options.project,
      mergeRequest: options.mr,
      force: options.force,
    });

    // Fetch merge request details
    const mergeRequest = await gitlabService.getMergeRequest(options.project, options.mr);

    if (!mergeRequest) {
      logger.error('Merge request not found', {
        project: options.project,
        mergeRequest: options.mr,
      });
      process.exit(1);
    }

    logger.info('Merge request found', {
      title: mergeRequest.title,
      author: mergeRequest.author.username,
      state: mergeRequest.state,
    });

    // Check if already reviewed (unless force flag is set)
    // if (!options.force) {
    //   const notes = await gitlabService.getMergeRequestNotes(options.project, options.mr);

    //   const hasReview = notes.some(
    //     (note) => note.author.username === 'gitlab-bot' && note.body.includes('AI Code Review')
    //   );

    //   if (hasReview) {
    //     logger.warn('Merge request already reviewed. Use --force to review again.');
    //     process.exit(0);
    //   }
    // }

    // Perform review
    logger.info('Performing code review...');
    const result = await reviewService.reviewMergeRequest(options.project, options.mr);

    logger.info('Code review completed successfully', {
      filesReviewed: result.filesReviewed,
      commentsPosted: result.commentsPosted,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Failed to perform code review', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};
