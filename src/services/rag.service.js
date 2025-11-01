/**
 * RAG (Retrieval-Augmented Generation) Service
 * Provides context-aware best practices for code review
 * Falls back to local knowledge base if Dify RAG is unavailable
 */

const difyService = require('./dify.service');
const localRAGService = require('./localRag.service');
const config = require('../config');
const logger = require('../utils/logger');

class RAGService {
  constructor() {
    // Cache for frequently accessed knowledge
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  /**
   * Get relevant context from knowledge base
   * @param {string} filePath - File being reviewed
   * @param {string} diff - Code changes
   * @returns {Promise<object|null>} - Relevant context and sources
   */
  async getRelevantContext(filePath, diff) {
    if (!config.rag.enabled) {
      return null;
    }

    const category = this.determineCategory(filePath);
    const query = this.buildKnowledgeQuery(filePath, diff);

    // Check cache
    const cacheKey = this.getCacheKey(category, query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.debug('RAG cache hit', { filePath, category });
      return cached;
    }

    try {
      logger.debug('Querying knowledge base', { filePath, category });

      // Try Dify RAG first
      const result = await difyService.queryKnowledgeBase(query, category);

      if (result) {
        // Cache the result
        this.setCache(cacheKey, result);

        logger.info('RAG context retrieved from Dify', {
          filePath,
          category,
          sources: result.sources.length,
        });

        return result;
      }

      // Fallback to local RAG if Dify fails
      logger.warn('Dify RAG unavailable, using local knowledge base', {
        filePath,
        category,
      });

      const localResult = await localRAGService.search(query, category);

      if (localResult) {
        this.setCache(cacheKey, localResult);

        logger.info('RAG context retrieved from local files', {
          filePath,
          category,
          sources: localResult.sources.length,
        });
      }

      return localResult;
    } catch (error) {
      logger.error('RAG query failed, trying local fallback', {
        filePath,
        error: error.message,
      });

      // Try local RAG as final fallback
      try {
        return await localRAGService.search(query, category);
      } catch (localError) {
        logger.error('Local RAG also failed', {
          error: localError.message,
        });
        return null;
      }
    }
  }

  /**
   * Determine best practices category
   * @private
   */
  determineCategory(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const path = filePath.toLowerCase();

    // Frontend categories
    if (['jsx', 'tsx'].includes(ext) || path.includes('react')) {
      return 'react';
    }
    if (ext === 'vue' || path.includes('vue')) {
      return 'vue';
    }
    if (path.includes('angular')) {
      return 'angular';
    }
    if (['css', 'scss', 'less'].includes(ext)) {
      return 'css';
    }
    if (ext === 'html') {
      return 'html';
    }

    // General frontend
    if (['js', 'ts'].includes(ext) && this.isFrontendPath(path)) {
      return 'frontend';
    }

    // Backend categories
    if (ext === 'py') {
      return 'python';
    }
    if (ext === 'go') {
      return 'golang';
    }
    if (ext === 'java') {
      return 'java';
    }

    // Security-related
    if (path.includes('auth') || path.includes('security')) {
      return 'security';
    }

    // API-related
    if (path.includes('api') || path.includes('controller')) {
      return 'api';
    }

    // Database
    if (path.includes('model') || path.includes('repository') || ext === 'sql') {
      return 'database';
    }

    return 'general';
  }

  /**
   * Check if path indicates frontend code
   * @private
   */
  isFrontendPath(path) {
    const frontendIndicators = [
      'components',
      'views',
      'pages',
      'frontend',
      'client',
      'ui',
      'src/app',
      'public',
    ];

    return frontendIndicators.some((indicator) => path.includes(indicator));
  }

  /**
   * Build knowledge base query from file context
   * @private
   */
  buildKnowledgeQuery(filePath, diff) {
    const fileName = filePath.split('/').pop();
    const ext = fileName.split('.').pop();

    // Extract key patterns from diff
    const patterns = this.extractPatterns(diff);

    // Build focused query
    let query = `Best practices for ${fileName}`;

    if (patterns.hasStateManagement) {
      query += ' with state management';
    }
    if (patterns.hasAsyncOperations) {
      query += ' and async operations';
    }
    if (patterns.hasAPIcalls) {
      query += ' and API integration';
    }
    if (patterns.hasAccessibility) {
      query += ' focusing on accessibility';
    }
    if (patterns.hasPerformance) {
      query += ' and performance optimization';
    }

    return query;
  }

  /**
   * Extract patterns from diff to focus query
   * @private
   */
  extractPatterns(diff) {
    return {
      hasStateManagement: /useState|useReducer|redux|vuex|store/i.test(diff),
      hasAsyncOperations: /async|await|Promise|then\(|catch\(/i.test(diff),
      hasAPIcalls: /fetch|axios|api\.|endpoint/i.test(diff),
      hasAccessibility: /aria-|role=|alt=|label/i.test(diff),
      hasPerformance: /useMemo|useCallback|memo\(|performance/i.test(diff),
      hasSecurity: /password|token|auth|sanitize|escape/i.test(diff),
      hasTestCode: /test\(|it\(|describe\(|expect\(/i.test(diff),
      hasErrorHandling: /try|catch|error|exception/i.test(diff),
    };
  }

  /**
   * Get specific best practice by topic
   * @param {string} topic - Best practice topic
   * @returns {Promise<object|null>} - Best practice guide
   */
  async getBestPractice(topic) {
    const topicQueries = {
      'react-hooks': 'React hooks best practices and common pitfalls',
      accessibility: 'Web accessibility WCAG guidelines and ARIA usage',
      security: 'Frontend security best practices and vulnerabilities',
      performance: 'Web performance optimization techniques',
      testing: 'Frontend testing strategies and patterns',
      'css-architecture': 'CSS architecture and maintainable styles',
      'api-design': 'RESTful API design best practices',
      'error-handling': 'Error handling and logging best practices',
    };

    const query = topicQueries[topic];
    if (!query) {
      logger.warn('Unknown best practice topic', { topic });
      return null;
    }

    try {
      // Try Dify first
      const result = await difyService.queryKnowledgeBase(query, 'general');
      if (result) return result;

      // Fallback to local
      return await localRAGService.getBestPractice(topic);
    } catch (error) {
      logger.error('Failed to get best practice', { topic, error: error.message });
      // Try local as fallback
      return await localRAGService.getBestPractice(topic);
    }
  }

  /**
   * Get checklist for specific file type
   * @param {string} fileType - File type/category
   * @returns {Promise<Array<string>>} - Checklist items
   */
  async getChecklist(fileType) {
    const checklists = {
      react: [
        'Component follows single responsibility principle',
        'Props are properly typed/validated',
        'State updates are immutable',
        'Effects have proper dependencies',
        'No unnecessary re-renders',
        'Accessibility attributes present',
        'Error boundaries implemented',
        'Loading and error states handled',
      ],
      vue: [
        'Component composition is clear',
        'Props are validated',
        'Reactive data is properly declared',
        'Computed properties for derived state',
        'Lifecycle hooks used appropriately',
        'Event handling is explicit',
        'Slots used for composition',
      ],
      css: [
        'No inline styles',
        'Consistent naming convention',
        'Responsive design implemented',
        'Accessibility considerations',
        'Browser compatibility checked',
        'Performance optimized',
        'Maintainable structure',
      ],
      api: [
        'Input validation implemented',
        'Error handling comprehensive',
        'Authentication/authorization checked',
        'Rate limiting considered',
        'Proper HTTP status codes',
        'API versioning maintained',
        'Documentation updated',
      ],
      security: [
        'No hardcoded credentials',
        'Input sanitization applied',
        'SQL injection prevention',
        'XSS protection implemented',
        'CSRF tokens used',
        'Sensitive data encrypted',
        'Logging excludes PII',
      ],
    };

    return checklists[fileType] || [];
  }

  /**
   * Cache management
   * @private
   */
  getCacheKey(category, query) {
    return `${category}:${query.substring(0, 100)}`;
  }

  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiry
    if (Date.now() - entry.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  setCache(key, data) {
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('RAG cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 100,
      expiryMs: this.cacheExpiry,
    };
  }
}

module.exports = new RAGService();
