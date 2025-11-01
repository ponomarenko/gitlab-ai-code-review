/**
 * GitLab Service
 * Handles all GitLab API operations
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { GitLabAPIError } = require('../utils/errors');

class GitLabService {
  constructor() {
    this.client = axios.create({
      baseURL: `${config.gitlab.url}/api/v4`,
      headers: {
        'PRIVATE-TOKEN': config.gitlab.token,
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (cfg) => {
        logger.debug('GitLab API request', {
          method: cfg.method,
          url: cfg.url,
        });
        return cfg;
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message;
        logger.error('GitLab API error', {
          status: error.response?.status,
          message,
          url: error.config?.url,
        });
        throw new GitLabAPIError(message, error.response?.status);
      },
    );
  }

  /**
   * Get merge request details
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @returns {Promise<object>} - MR details
   */
  async getMergeRequest(projectId, mrIid) {
    try {
      const { data } = await this.client.get(
        `/projects/${projectId}/merge_requests/${mrIid}`,
      );

      logger.info('Retrieved MR details', {
        projectId,
        mrIid,
        title: data.title,
      });

      return data;
    } catch (error) {
      logger.error('Failed to get MR', { projectId, mrIid });
      throw error;
    }
  }

  /**
   * Get merge request changes (diffs)
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @returns {Promise<object>} - MR changes with diffs
   */
  async getMergeRequestChanges(projectId, mrIid) {
    try {
      const { data } = await this.client.get(
        `/projects/${projectId}/merge_requests/${mrIid}/changes`,
      );

      logger.info('Retrieved MR changes', {
        projectId,
        mrIid,
        filesChanged: data.changes?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Failed to get MR changes', { projectId, mrIid });
      throw error;
    }
  }

  /**
   * Get merge request commits
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @returns {Promise<Array>} - List of commits
   */
  async getMergeRequestCommits(projectId, mrIid) {
    try {
      const { data } = await this.client.get(
        `/projects/${projectId}/merge_requests/${mrIid}/commits`,
      );

      logger.debug('Retrieved MR commits', {
        projectId,
        mrIid,
        commits: data.length,
      });

      return data;
    } catch (error) {
      logger.error('Failed to get MR commits', { projectId, mrIid });
      throw error;
    }
  }

  /**
   * Add comment to merge request
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @param {string} comment - Comment body (markdown supported)
   * @returns {Promise<object>} - Created note
   */
  async addMergeRequestComment(projectId, mrIid, comment) {
    try {
      const { data } = await this.client.post(
        `/projects/${projectId}/merge_requests/${mrIid}/notes`,
        { body: comment },
      );

      logger.info('Added MR comment', {
        projectId,
        mrIid,
        noteId: data.id,
      });

      return data;
    } catch (error) {
      logger.error('Failed to add MR comment', { projectId, mrIid });
      throw error;
    }
  }

  /**
   * Add inline comment to specific line
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @param {object} position - Line position info
   * @param {string} comment - Comment text
   * @returns {Promise<object>} - Created discussion
   */
  async addInlineComment(projectId, mrIid, position, comment) {
    try {
      const { data } = await this.client.post(
        `/projects/${projectId}/merge_requests/${mrIid}/discussions`,
        {
          body: comment,
          position: {
            position_type: 'text',
            ...position,
          },
        },
      );

      logger.info('Added inline comment', {
        projectId,
        mrIid,
        file: position.new_path,
        line: position.new_line,
      });

      return data;
    } catch (error) {
      logger.error('Failed to add inline comment', {
        projectId,
        mrIid,
        file: position.new_path,
      });
      throw error;
    }
  }

  /**
   * Update merge request labels
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @param {Array<string>} labels - Labels to add
   * @returns {Promise<object>} - Updated MR
   */
  async updateMergeRequestLabels(projectId, mrIid, labels) {
    try {
      const { data } = await this.client.put(
        `/projects/${projectId}/merge_requests/${mrIid}`,
        { add_labels: labels.join(',') },
      );

      logger.info('Updated MR labels', {
        projectId,
        mrIid,
        labels,
      });

      return data;
    } catch (error) {
      logger.error('Failed to update labels', { projectId, mrIid });
      throw error;
    }
  }

  /**
   * Get project details
   * @param {number} projectId - Project ID
   * @returns {Promise<object>} - Project details
   */
  async getProject(projectId) {
    try {
      const { data } = await this.client.get(`/projects/${projectId}`);

      logger.debug('Retrieved project details', {
        projectId,
        name: data.name,
      });

      return data;
    } catch (error) {
      logger.error('Failed to get project', { projectId });
      throw error;
    }
  }

  /**
   * Get file content from repository
   * @param {number} projectId - Project ID
   * @param {string} filePath - File path
   * @param {string} ref - Branch or commit ref
   * @returns {Promise<string>} - File content
   */
  async getFileContent(projectId, filePath, ref = 'main') {
    try {
      const { data } = await this.client.get(
        `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          params: { ref },
        },
      );

      // Content is base64 encoded
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      logger.debug('Retrieved file content', {
        projectId,
        filePath,
        size: content.length,
      });

      return content;
    } catch (error) {
      logger.error('Failed to get file content', {
        projectId,
        filePath,
        ref,
      });
      throw error;
    }
  }

  /**
   * Create or update merge request status check
   * @param {number} projectId - Project ID
   * @param {string} commitSha - Commit SHA
   * @param {string} state - Status (pending, running, success, failed)
   * @param {string} description - Status description
   * @returns {Promise<object>} - Commit status
   */
  async updateCommitStatus(projectId, commitSha, state, description) {
    try {
      const { data } = await this.client.post(
        `/projects/${projectId}/statuses/${commitSha}`,
        {
          state,
          description,
          name: 'AI Code Review',
          context: 'ai-review',
        },
      );

      logger.info('Updated commit status', {
        projectId,
        commitSha: commitSha.substring(0, 8),
        state,
      });

      return data;
    } catch (error) {
      logger.error('Failed to update commit status', {
        projectId,
        commitSha: commitSha.substring(0, 8),
      });
      throw error;
    }
  }

  /**
   * React to merge request with emoji
   * @param {number} projectId - Project ID
   * @param {number} mrIid - MR internal ID
   * @param {string} emoji - Emoji name (thumbsup, tada, etc.)
   * @returns {Promise<object>} - Award emoji
   */
  async addEmoji(projectId, mrIid, emoji) {
    try {
      const { data } = await this.client.post(
        `/projects/${projectId}/merge_requests/${mrIid}/award_emoji`,
        { name: emoji },
      );

      logger.debug('Added emoji reaction', {
        projectId,
        mrIid,
        emoji,
      });

      return data;
    } catch (error) {
      logger.error('Failed to add emoji', { projectId, mrIid, emoji });
      // Don't throw - emoji is optional
      return null;
    }
  }
}

module.exports = new GitLabService();
