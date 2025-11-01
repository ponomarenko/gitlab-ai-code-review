/**
 * Review Service
 * Orchestrates code review process
 */

const gitlabService = require('./gitlab.service');
const difyService = require('./dify.service');
const ragService = require('./rag.service');
const config = require('../config');
const logger = require('../utils/logger');
const { ReviewError } = require('../utils/errors');

class ReviewService {
  /**
   * Review merge request
   * @param {number} projectId - GitLab project ID
   * @param {number} mrIid - MR internal ID
   * @param {object} options - Review options
   * @returns {Promise<object>} - Review results
   */
  async reviewMergeRequest(projectId, mrIid, options = {}) {
    const startTime = Date.now();
    logger.info('Starting MR review', { projectId, mrIid });

    try {
      // Update commit status to pending
      const mrData = await gitlabService.getMergeRequest(projectId, mrIid);
      const latestCommit = mrData.sha;

      await gitlabService.updateCommitStatus(
        projectId,
        latestCommit,
        'running',
        'AI code review in progress...',
      );

      // Get MR changes
      const changes = await gitlabService.getMergeRequestChanges(projectId, mrIid);

      // Filter files to review
      const filesToReview = this.filterFilesToReview(changes.changes);

      if (filesToReview.length === 0) {
        logger.info('No files to review', { projectId, mrIid });
        await this.publishEmptyReview(projectId, mrIid);
        return { success: true, filesReviewed: 0 };
      }

      // Limit number of files
      const limitedFiles = filesToReview.slice(0, config.review.maxFilesPerReview);

      if (filesToReview.length > limitedFiles.length) {
        logger.warn('File limit exceeded', {
          total: filesToReview.length,
          reviewed: limitedFiles.length,
        });
      }

      // Review files in parallel with concurrency limit
      const reviews = await this.reviewFilesWithConcurrency(
        limitedFiles,
        mrData,
        options,
      );

      // Publish review results
      await this.publishReview(projectId, mrIid, reviews, {
        totalFiles: filesToReview.length,
        reviewedFiles: limitedFiles.length,
        duration: Date.now() - startTime,
      });

      // Update commit status to success
      await gitlabService.updateCommitStatus(
        projectId,
        latestCommit,
        'success',
        `AI review completed: ${reviews.length} files analyzed`,
      );

      // Add success emoji
      await gitlabService.addEmoji(projectId, mrIid, 'robot_face');

      logger.info('Review completed', {
        projectId,
        mrIid,
        filesReviewed: reviews.length,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        filesReviewed: reviews.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Review failed', {
        projectId,
        mrIid,
        error: error.message,
        stack: error.stack,
      });

      // Update commit status to failed
      try {
        const mrData = await gitlabService.getMergeRequest(projectId, mrIid);
        await gitlabService.updateCommitStatus(
          projectId,
          mrData.sha,
          'failed',
          'AI review failed - check logs',
        );
      } catch (statusError) {
        logger.error('Failed to update commit status', {
          error: statusError.message,
        });
      }

      throw new ReviewError(`Review failed: ${error.message}`);
    }
  }

  /**
   * Filter files that should be reviewed
   * @private
   */
  filterFilesToReview(changes) {
    return changes.filter((change) => {
      // Skip deleted files
      if (change.deleted_file) {
        return false;
      }

      // Skip files matching patterns
      const shouldSkip = config.review.skipPatterns.some((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(change.new_path);
        }
        return change.new_path.includes(pattern);
      });

      if (shouldSkip) {
        logger.debug('Skipping file', { file: change.new_path });
        return false;
      }

      // Skip large diffs
      if (change.diff && change.diff.length > config.review.maxDiffSize) {
        logger.warn('Diff too large, skipping', {
          file: change.new_path,
          size: change.diff.length,
        });
        return false;
      }

      // Skip binary files
      if (this.isBinaryFile(change.new_path)) {
        logger.debug('Skipping binary file', { file: change.new_path });
        return false;
      }

      return true;
    });
  }

  /**
   * Check if file is binary
   * @private
   */
  isBinaryFile(filePath) {
    const binaryExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'webp',
      'pdf', 'zip', 'tar', 'gz', 'rar',
      'mp3', 'mp4', 'avi', 'mov',
      'exe', 'dll', 'so', 'dylib',
      'woff', 'woff2', 'ttf', 'eot',
    ];

    const ext = filePath.split('.').pop().toLowerCase();
    return binaryExtensions.includes(ext);
  }

  /**
   * Review files with concurrency control
   * @private
   */
  async reviewFilesWithConcurrency(files, mrData, options) {
    const concurrency = 3; // Max parallel reviews
    const results = [];

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      // eslint-disable-next-line no-await-in-loop
      const batchResults = await Promise.allSettled(
        batch.map((file) => this.reviewFile(file, mrData, options)),
      );

      // Collect successful reviews
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else if (result.status === 'rejected') {
          logger.error('File review failed', {
            file: batch[index].new_path,
            error: result.reason.message,
          });
        }
      });
    }

    return results;
  }

  /**
   * Review single file
   * @private
   */
  async reviewFile(change, mrData, options) {
    const { new_path: filePath, diff } = change;
    const language = this.detectLanguage(filePath);

    logger.debug('Reviewing file', { filePath, language });

    try {
      // Get RAG context if enabled and frontend file
      let ragContext = null;
      if (config.rag.enabled && this.isFrontendFile(filePath)) {
        ragContext = await ragService.getRelevantContext(filePath, diff);
      }

      // Analyze with Dify
      const context = {
        mrTitle: mrData.title,
        mrDescription: mrData.description,
        ragContext: ragContext?.answer,
        conversationId: options.conversationId,
      };

      const result = await difyService.analyzeCode(diff, filePath, language, context);

      return {
        file: filePath,
        language,
        review: result.answer,
        messageId: result.messageId,
        hasBestPractices: !!ragContext,
        ragSources: ragContext?.sources || [],
      };
    } catch (error) {
      logger.error('File review error', {
        file: filePath,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Detect programming language from file extension
   * @private
   */
  detectLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();

    const languageMap = {
      js: 'JavaScript',
      jsx: 'React JSX',
      ts: 'TypeScript',
      tsx: 'React TSX',
      vue: 'Vue.js',
      py: 'Python',
      java: 'Java',
      go: 'Go',
      rb: 'Ruby',
      php: 'PHP',
      cs: 'C#',
      cpp: 'C++',
      c: 'C',
      rs: 'Rust',
      kt: 'Kotlin',
      swift: 'Swift',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      less: 'Less',
      sql: 'SQL',
      sh: 'Shell',
      yaml: 'YAML',
      yml: 'YAML',
      json: 'JSON',
      md: 'Markdown',
    };

    return languageMap[ext] || null;
  }

  /**
   * Check if file is frontend-related
   * @private
   */
  isFrontendFile(filePath) {
    const frontendPatterns = [
      /\.(jsx?|tsx?|vue|html|css|scss|less)$/,
      /components?\//i,
      /views?\//i,
      /pages?\//i,
      /frontend\//i,
      /client\//i,
    ];

    return frontendPatterns.some((pattern) => pattern.test(filePath));
  }

  /**
   * Publish review results to GitLab
   * @private
   */
  async publishReview(projectId, mrIid, reviews, meta) {
    if (reviews.length === 0) {
      // eslint-disable-next-line no-return-await
      return await this.publishEmptyReview(projectId, mrIid);
    }

    // Build review comment
    const comment = this.buildReviewComment(reviews, meta);

    // Post to GitLab
    await gitlabService.addMergeRequestComment(projectId, mrIid, comment);

    // Add inline comments if enabled
    if (config.review.enableInlineComments) {
      await this.addInlineComments(projectId, mrIid, reviews);
    }
  }

  /**
   * Build formatted review comment
   * @private
   */
  buildReviewComment(reviews, meta) {
    const { reviewedFiles, totalFiles, duration } = meta;

    let comment = '## 🤖 AI Code Review Results\n\n';
    comment += `**Files analyzed:** ${reviewedFiles}/${totalFiles}\n`;
    comment += `**Duration:** ${(duration / 1000).toFixed(1)}s\n\n`;
    comment += '---\n\n';

    reviews.forEach(({
      file, language, review, hasBestPractices, ragSources,
    }) => {
      comment += `### 📄 \`${file}\`\n\n`;

      if (language) {
        comment += `**Language:** ${language}\n\n`;
      }

      if (hasBestPractices && ragSources.length > 0) {
        comment += '✨ *Best practices reference applied*\n\n';
      }

      comment += `${review}\n\n`;
      comment += '---\n\n';
    });

    comment += '*Generated by AI Code Review Bot powered by Dify*\n';
    comment += '*Please review AI suggestions carefully before implementing changes.*';

    return comment;
  }

  /**
   * Publish empty review notice
   * @private
   */
  async publishEmptyReview(projectId, mrIid) {
    const comment = '## 🤖 AI Code Review\n\n'
      + 'No reviewable files found in this merge request.\n\n'
      + '*Files may have been skipped due to:*\n'
      + '- Binary files\n'
      + '- Generated/minified code\n'
      + '- Lock files\n'
      + '- Files exceeding size limits';

    await gitlabService.addMergeRequestComment(projectId, mrIid, comment);
  }

  /**
   * Add inline comments (if enabled)
   * @private
   */
  // eslint-disable-next-line no-unused-vars
  async addInlineComments(projectId, mrIid, reviews) {
    // Implementation for inline comments
    // This would parse review results and add line-specific comments
    logger.debug('Inline comments not yet implemented');
  }
}

module.exports = new ReviewService();
