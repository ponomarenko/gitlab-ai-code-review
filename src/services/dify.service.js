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
    const { mrTitle = '', mrDescription = '' } = context;

    return `You are an expert code reviewer. Analyze the following code changes and provide ONLY actionable feedback for issues that require changes.

**Context:**
- File: ${fileName}
- Language: ${language || 'auto-detect'}
${mrTitle ? `- MR Title: ${mrTitle}` : ''}
${mrDescription ? `- MR Description: ${mrDescription}` : ''}

**Changes:**
\`\`\`diff
${diff}
\`\`\`

**CRITICAL INSTRUCTIONS:**
1. Report ONLY issues that require code changes
2. Skip sections where everything is acceptable - DO NOT mention them at all
3. DO NOT provide generic advice about testing, documentation, or MR descriptions
4. DO NOT include suggestions for "how to test" or "what to document"
5. Focus on actual code problems, not process recommendations
6. Keep response concise (under 300 words total)

**Review Areas (include section ONLY if issues found):**

🔴 **Critical Issues** (bugs/security - must fix):
- Logic errors, potential crashes, null pointer exceptions
- Security vulnerabilities (XSS, injection, auth bypass)
- Breaking changes or data loss risks

🟡 **Important Issues** (performance/quality - should fix):
- Performance bottlenecks, memory leaks, N+1 queries
- Code smells (complex logic, duplications, tight coupling)
- Missing critical error handling

🔵 **Code Quality** (maintainability - optional):
- Unclear naming or confusing structure
- Violations of language-specific best practices
${
  language && this.isFrontendLanguage(language)
    ? `
🎨 **Frontend Issues** (only if problems found):
- Accessibility violations (missing ARIA, keyboard navigation)
- Performance issues (unnecessary re-renders, large bundles)
- Responsive design problems`
    : ''
}

**Output Rules:**
- Each issue: severity emoji + specific problem + line reference (if applicable)
- Provide code fix example only for complex issues
- Maximum 3-4 issues per severity level
- If code is good with NO issues: respond EXACTLY with "NO_ISSUES_FOUND"
- If code has issues: provide detailed feedback

**IMPORTANT:**
If there are absolutely NO critical, important, or code quality issues, respond with exactly:
NO_ISSUES_FOUND

Otherwise, provide the issue list.

**Example output with issues:**
🔴 **Critical Issues**
- Line 42: Null pointer risk when \`user.profile\` is undefined - add null check

🟡 **Important Issues**
- Lines 15-20: Database query in loop causes N+1 problem - fetch all records first

**Example when no issues:**
NO_ISSUES_FOUND`;
  }

  /**
   * Build critical-only review prompt (minimal feedback)
   * @private
   */
  buildCriticalOnlyPrompt(diff, fileName, language, context) {
    const { mrTitle = '', mrDescription = '' } = context;

    return `You are an expert code reviewer. Focus ONLY on critical bugs and security issues.

**Context:**
- File: ${fileName}
- Language: ${language || 'auto-detect'}
${mrTitle ? `- MR Title: ${mrTitle}` : ''}
${mrDescription ? `- MR Description: ${mrDescription}` : ''}

**Changes:**
\`\`\`diff
${diff}
\`\`\`

**CRITICAL INSTRUCTIONS:**
1. Report ONLY critical bugs and security vulnerabilities
2. Ignore code style, performance, and best practices unless critical
3. Skip minor issues and suggestions completely
4. Maximum 200 words total
5. DO NOT mention testing, documentation, or code quality

**Report ONLY:**

🔴 **Critical Issues** (must fix before merge):
- Logic errors that cause crashes or data corruption
- Security vulnerabilities (XSS, SQL injection, auth bypass, data leaks)
- Breaking changes that break existing functionality

**Output Rules:**
- List only critical problems
- No suggestions or improvements
- Maximum 2-3 critical issues
- If NO critical issues found: respond EXACTLY with "NO_ISSUES_FOUND"

**Example with critical issues:**
🔴 **Critical Issues**
- Line 42: SQL injection vulnerability - user input not sanitized
- Line 58: Authentication bypass - missing permission check

**Example with no critical issues:**
NO_ISSUES_FOUND`;
  }

  /**
   * Build detailed review prompt (comprehensive feedback)
   * @private
   */
  buildDetailedPrompt(diff, fileName, language, context) {
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
   * Filter out generic/empty sections from AI response
   * @private
   */
  filterReviewResponse(aiResponse) {
    if (!aiResponse) return aiResponse;

    // Check if AI explicitly said no issues
    if (aiResponse.trim() === 'NO_ISSUES_FOUND' || aiResponse.includes('NO_ISSUES_FOUND')) {
      return null; // Signal to skip this file
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

    // If response is too short after filtering, might indicate everything was generic
    const trimmed = filtered.trim();
    if (trimmed.length < 50 && aiResponse.length > 100) {
      return null; // Skip files with only generic content
    }

    // If filtered response is essentially empty, skip this file
    if (trimmed.length < 10) {
      return null;
    }

    return trimmed;
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
