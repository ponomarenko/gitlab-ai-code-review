/**
 * Dify AI Service
 * Handles communication with Dify API for code analysis and RAG
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { DifyAPIError } = require('../utils/errors');
const promptLoader = require('../utils/prompt-loader');

class DifyService {
  constructor() {
    this.client = axios.create({
      baseURL: config.dify.apiUrl,
      headers: {
        Authorization: `Bearer ${config.dify.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (cfg) => {
        logger.debug('Dify API request', {
          method: cfg.method,
          url: cfg.url,
        });
        return cfg;
      },
      (error) => {
        logger.error('Dify API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message;
        logger.error('Dify API error', {
          status: error.response?.status,
          message,
          url: error.config?.url,
        });
        throw new DifyAPIError(message, error.response?.status);
      }
    );
  }

  /**
   * Analyze code changes with AI
   * @param {string} diff - Git diff content
   * @param {string} fileName - Name of the file
   * @param {string} language - Programming language
   * @param {object} context - Additional context (MR title, description, etc.)
   * @returns {Promise<string>} - AI analysis result
   */
  async analyzeCode(diff, fileName, language, context = {}) {
    const prompt = this.buildCodeReviewPrompt(diff, fileName, language, context);

    try {
      const response = await this.client.post('/chat-messages', {
        inputs: {
          file_name: fileName,
          language: language || 'auto-detect',
          ...context,
        },
        query: prompt,
        response_mode: 'blocking',
        user: config.dify.user,
        conversation_id: context.conversationId || '',
      });

      logger.info('Code analysis completed', {
        fileName,
        language,
        messageId: response.data.message_id,
      });

      return {
        answer: this.filterReviewResponse(response.data.answer),
        messageId: response.data.message_id,
        conversationId: response.data.conversation_id,
      };
    } catch (error) {
      logger.error('Code analysis failed', {
        fileName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Query RAG knowledge base for best practices
   * @param {string} query - Query text
   * @param {string} category - Category (frontend, backend, security, etc.)
   * @returns {Promise<object>} - RAG response with relevant documents
   */
  async queryKnowledgeBase(query, category = 'frontend') {
    if (!config.rag.enabled) {
      logger.debug('RAG is disabled');
      return null;
    }

    try {
      const response = await this.client.post('/chat-messages', {
        inputs: {
          category,
          knowledge_base: config.rag.knowledgeBase,
        },
        query: `Based on best practices: ${query}`,
        response_mode: 'blocking',
        user: config.dify.user,
      });

      logger.info('RAG query completed', {
        query,
        category,
        documentsFound: response.data.metadata?.retriever_resources?.length || 0,
      });

      return {
        answer: response.data.answer,
        sources: response.data.metadata?.retriever_resources || [],
        messageId: response.data.message_id,
      };
    } catch (error) {
      logger.error('RAG query failed', {
        query,
        error: error.message,
      });
      // Don't throw - RAG is optional enhancement
      return null;
    }
  }

  /**
   * Build comprehensive code review prompt
   * @private
   */
  buildCodeReviewPrompt(diff, fileName, language, context) {
    const reviewFocus = config.review.focus || 'actionable';

    // Different prompt based on review focus level
    if (reviewFocus === 'critical-only') {
      return this.buildCriticalOnlyPrompt(diff, fileName, language, context);
    }
    if (reviewFocus === 'detailed') {
      return this.buildDetailedPrompt(diff, fileName, language, context);
    }

    // Default: actionable
    return this.buildActionablePrompt(diff, fileName, language, context);
  }

  /**
   * Build actionable review prompt (default)
   * @private
   */
  buildActionablePrompt(diff, fileName, language, context) {
    const { mrTitle = '', mrDescription = '', fileUrl = '' } = context;

    return promptLoader.getPrompt('actionable-review', {
      diff,
      fileName,
      language: language || 'auto-detect',
      mrTitle,
      mrDescription,
      fileUrl,
      isFrontend: language && this.isFrontendLanguage(language),
    });
  }

  /**
   * Build critical-only review prompt (minimal feedback)
   * @private
   */
  buildCriticalOnlyPrompt(diff, fileName, language, context) {
    const { mrTitle = '', mrDescription = '', fileUrl = '' } = context;

    return promptLoader.getPrompt('critical-only-review', {
      diff,
      fileName,
      language: language || 'auto-detect',
      mrTitle,
      mrDescription,
      fileUrl,
    });
  }

  /**
   * Build detailed review prompt (comprehensive feedback)
   * @private
   */
  buildDetailedPrompt(diff, fileName, language, context) {
    const { mrTitle = '', mrDescription = '', fileUrl = '' } = context;

    return promptLoader.getPrompt('detailed-review', {
      diff,
      fileName,
      language: language || 'auto-detect',
      mrTitle,
      mrDescription,
      fileUrl,
      isFrontend: language && this.isFrontendLanguage(language),
    });
  }

  /**
   * Check if language is frontend-related
   * @private
   */
  isFrontendLanguage(language) {
    const frontendLangs = [
      'javascript',
      'typescript',
      'jsx',
      'tsx',
      'vue',
      'html',
      'css',
      'scss',
      'less',
    ];
    return frontendLangs.some((lang) => language.toLowerCase().includes(lang));
  }

  /**
   * Filter out generic/empty sections from AI response
   * @private
   */
  filterReviewResponse(aiResponse) {
    if (!aiResponse) return aiResponse;

    const trimmed = aiResponse.trim();

    // Check if AI explicitly said no issues
    if (trimmed === 'NO_ISSUES_FOUND' || trimmed.includes('NO_ISSUES_FOUND')) {
      return null; // Signal to skip this file
    }

    // Check if response doesn't have the issues marker
    if (!trimmed.includes('<!-- ISSUES_FOUND -->')) {
      // If response is very short and doesn't have marker, probably empty
      if (trimmed.length < 50) {
        return null;
      }
    }

    // Patterns for generic advice that should be removed
    const genericPatterns = [
      // Generic testing advice
      /##?\s*[🧪📝]?\s*Testing[:\s]*\n+[\s\S]*?(Consider adding|Add tests|Make sure to test|Write unit tests)[^\n]*\n*/giu,
      /##?\s*[🧪📝]?\s*Test\s+Coverage[:\s]*\n+[\s\S]*?(should|could|consider)[^\n]*\n*/giu,

      // Generic documentation advice
      /##?\s*[📝📚]?\s*Documentation[:\s]*\n+[\s\S]*?(Add comments|Update README|Document the|Consider documenting)[^\n]*\n*/giu,

      // Generic MR description advice
      /[\s\S]*?(update|describe|mention|include).*?(MR description|merge request|pull request)[^\n]*\n*/gi,

      // Empty sections with "No issues" or "Everything looks good"
      /##?\s*[🟢✅]?\s*\w+[:\s]*\n+[\s\S]*?(No issues found|Everything looks good|All good|Looks fine|No problems)[^\n]*\n*/giu,

      // Generic "how to test" instructions
      /[\s\S]*?(Test plan|Testing strategy|How to test)[:\s]*\n+[\s\S]*?(\n##|\n\n|$)/gi,
    ];

    let filtered = aiResponse;

    // Apply all generic pattern filters
    genericPatterns.forEach((pattern) => {
      filtered = filtered.replace(pattern, '');
    });

    // Remove empty sections (headers with no content)
    filtered = filtered.replace(/##?\s*[^\n]+\n+(?=##|$)/g, '');

    // Remove multiple consecutive newlines
    filtered = filtered.replace(/\n{3,}/g, '\n\n');

    // Remove the marker if present
    filtered = filtered.replace(/<!--\s*ISSUES_FOUND\s*-->\s*/g, '');

    // If response is too short after filtering, might indicate everything was generic
    const finalTrimmed = filtered.trim();
    if (finalTrimmed.length < 50 && aiResponse.length > 100) {
      return null; // Skip files with only generic content
    }

    // If filtered response is essentially empty, skip this file
    if (finalTrimmed.length < 10) {
      return null;
    }

    return finalTrimmed;
  }

  /**
   * Get conversation history
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array>} - Message history
   */
  async getConversationHistory(conversationId) {
    try {
      const response = await this.client.get('/messages', {
        params: {
          conversation_id: conversationId,
          limit: 20,
        },
      });

      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get conversation history', {
        conversationId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Provide feedback on AI response
   * @param {string} messageId - Message ID
   * @param {number} rating - Rating (1-5)
   * @param {string} feedback - Optional text feedback
   */
  async provideFeedback(messageId, rating, feedback = '') {
    try {
      await this.client.post(`/messages/${messageId}/feedbacks`, {
        rating,
        content: feedback,
        user: config.dify.user,
      });

      logger.info('Feedback provided', { messageId, rating });
    } catch (error) {
      logger.error('Failed to provide feedback', {
        messageId,
        error: error.message,
      });
    }
  }
}

module.exports = new DifyService();
