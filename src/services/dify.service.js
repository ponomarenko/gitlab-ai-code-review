/**
 * Dify AI Service
 * Handles communication with Dify API for code analysis and RAG
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { DifyAPIError } = require('../utils/errors');

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
        answer: response.data.answer,
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
    const { mrTitle = '', mrDescription = '' } = context;

    return `You are an expert code reviewer. Analyze the following code changes.

**Context:**
- File: ${fileName}
- Language: ${language || 'auto-detect'}
${mrTitle ? `- MR Title: ${mrTitle}` : ''}
${mrDescription ? `- MR Description: ${mrDescription}` : ''}

**Changes:**
\`\`\`diff
${diff}
\`\`\`

**Review Guidelines:**
Provide a detailed code review covering:

1. **🐛 Bugs & Errors**: Identify potential bugs, logic errors, or edge cases
2. **🔒 Security**: Highlight security vulnerabilities or concerns
3. **⚡ Performance**: Suggest optimizations and performance improvements
4. **♻️ Code Quality**: Comment on code structure, naming, and maintainability
5. **✅ Best Practices**: Verify adherence to language-specific best practices
6. **🧪 Testing**: Identify missing tests or test scenarios
7. **📝 Documentation**: Note missing or unclear documentation

${
  language && this.isFrontendLanguage(language)
    ? `
**Frontend-Specific Checks:**
- Accessibility (WCAG compliance, ARIA labels, keyboard navigation)
- Responsive design considerations
- State management patterns
- Component reusability
- Browser compatibility
- Bundle size impact
`
    : ''
}

**Format:**
- Use clear, actionable feedback
- Prioritize issues by severity (Critical, Major, Minor)
- Provide code examples for suggestions
- Be constructive and educational

**Output:**
Structured review with clear sections and severity indicators.`;
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
