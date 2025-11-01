/**
 * Local RAG Service
 * Fallback service that reads knowledge base files locally when Dify RAG is unavailable
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class LocalRAGService {
  constructor() {
    this.knowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    this.cache = new Map();
  }

  /**
   * Search local knowledge base for relevant content
   * @param {string} query - Search query
   * @param {string} category - Category to search in
   * @returns {Promise<object|null>} - Relevant content
   */
  async search(query, category = 'frontend') {
    try {
      logger.debug('Searching local knowledge base', { query, category });

      // Get relevant files based on query and category
      const files = await this.getRelevantFiles(query, category);

      if (files.length === 0) {
        return null;
      }

      // Read and combine relevant content
      const contents = await Promise.all(files.map((file) => this.readFile(file)));

      const combinedContent = contents
        .filter((c) => c !== null)
        .map((c) => c.content)
        .join('\n\n---\n\n');

      return {
        answer: this.extractRelevantSections(combinedContent, query),
        sources: files.map((f) => ({
          document_name: path.basename(f),
          content: `${combinedContent.substring(0, 200)}...`,
        })),
        isLocal: true,
      };
    } catch (error) {
      logger.error('Local RAG search failed', {
        query,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get relevant files based on query and category
   * @private
   */
  async getRelevantFiles(query, category) {
    const queryLower = query.toLowerCase();
    const categoryPath = path.join(this.knowledgeBasePath, category);

    try {
      // Check if category directory exists
      await fs.access(categoryPath);
    } catch {
      // Fall back to all categories
      return this.getAllMarkdownFiles(this.knowledgeBasePath);
    }

    // Get files from specific category
    const files = await this.getAllMarkdownFiles(categoryPath);

    // Filter files by relevance
    const relevantFiles = [];

    for (const file of files) {
      const fileName = path.basename(file, '.md').toLowerCase();

      // Check if query matches file name
      if (this.matchesQuery(fileName, queryLower)) {
        relevantFiles.push(file);
      }
    }

    // If no specific matches, return all files from category (max 3)
    if (relevantFiles.length === 0) {
      return files.slice(0, 3);
    }

    return relevantFiles.slice(0, 3);
  }

  /**
   * Check if filename matches query
   * @private
   */
  matchesQuery(fileName, query) {
    // Extract keywords from query
    const keywords = query.split(/\s+/).filter((w) => w.length > 3);

    return keywords.some((keyword) => fileName.includes(keyword));
  }

  /**
   * Get all markdown files recursively
   * @private
   */
  async getAllMarkdownFiles(dir, fileList = []) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dir, file.name);

        if (file.isDirectory()) {
          await this.getAllMarkdownFiles(filePath, fileList);
        } else if (file.name.endsWith('.md')) {
          fileList.push(filePath);
        }
      }

      return fileList;
    } catch (error) {
      logger.error('Error reading directory', {
        dir,
        error: error.message,
      });
      return fileList;
    }
  }

  /**
   * Read file content
   * @private
   */
  async readFile(filePath) {
    // Check cache
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath);
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = {
        path: filePath,
        content,
      };

      // Cache the result
      this.cache.set(filePath, result);

      return result;
    } catch (error) {
      logger.error('Error reading file', {
        filePath,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Extract relevant sections from content based on query
   * @private
   */
  extractRelevantSections(content, query) {
    const lines = content.split('\n');
    const relevantSections = [];
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    let currentSection = [];
    let isRelevant = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      // Check if line is a heading
      if (line.startsWith('#')) {
        // Save previous section if relevant
        if (isRelevant && currentSection.length > 0) {
          relevantSections.push(currentSection.join('\n'));
        }

        // Start new section
        currentSection = [line];
        isRelevant = queryWords.some((word) => lineLower.includes(word));
      } else {
        currentSection.push(line);

        // Check if content is relevant
        if (!isRelevant && queryWords.some((word) => lineLower.includes(word))) {
          isRelevant = true;
        }
      }
    }

    // Add last section
    if (isRelevant && currentSection.length > 0) {
      relevantSections.push(currentSection.join('\n'));
    }

    // If no relevant sections found, return first 1000 chars
    if (relevantSections.length === 0) {
      return `${content.substring(0, 1000)}...`;
    }

    return relevantSections.join('\n\n---\n\n').substring(0, 2000);
  }

  /**
   * Get best practice by topic
   * @param {string} topic - Topic name
   * @returns {Promise<string|null>} - Best practice content
   */
  async getBestPractice(topic) {
    const topicFiles = {
      'react-hooks': 'frontend/react-best-practices.md',
      react: 'frontend/react-best-practices.md',
      angular: 'frontend/angular-best-practices.md',
      accessibility: 'frontend/accessibility.md',
      security: 'frontend/security.md',
      performance: 'frontend/performance.md',
    };

    const filePath = topicFiles[topic.toLowerCase()];
    if (!filePath) {
      return null;
    }

    const fullPath = path.join(this.knowledgeBasePath, filePath);
    const result = await this.readFile(fullPath);

    return result?.content || null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Local RAG cache cleared');
  }
}

module.exports = new LocalRAGService();
