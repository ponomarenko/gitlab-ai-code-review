/**
 * Repository Context Parser
 * Parses repository context files to extract metadata and configuration
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ContextParser {
  /**
   * Parse repository context file
   * @param {string} filePath - Path to context file
   * @returns {object} - Parsed context object
   */
  parseContextFile(filePath) {
    try {
      if (!filePath) {
        logger.debug('No context file provided');
        return null;
      }

      // Resolve absolute path
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        logger.warn('Context file not found', { path: absolutePath });
        return null;
      }

      // Read file content
      const content = fs.readFileSync(absolutePath, 'utf8');

      // Parse the content
      const context = this.parseContent(content);

      logger.info('Repository context loaded', {
        path: absolutePath,
        repoType: context.repoType,
        projectsCount: context.projects?.length || 0,
        hasSkipPatterns: !!context.skipPatterns?.length,
      });

      return context;
    } catch (error) {
      logger.error('Failed to parse context file', {
        path: filePath,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Parse markdown content to extract context
   * @private
   * @param {string} content - Markdown content
   * @returns {object} - Parsed context
   */
  parseContent(content) {
    const context = {
      raw: content, // Keep original content for AI prompt
      repoType: null,
      projects: [],
      codeStyle: [],
      reviewFocus: [],
      skipPatterns: [],
      customInstructions: '',
    };

    // Extract repository type
    const repoTypeMatch = content.match(/##\s*Repository Type\s*\n\s*(.+)/i);
    if (repoTypeMatch) {
      context.repoType = repoTypeMatch[1].trim().toLowerCase();
    }

    // Extract project structure
    const projectSection = this.extractSection(content, 'Project Structure');
    if (projectSection) {
      context.projects = this.parseListItems(projectSection);
    }

    // Extract code style guidelines
    const codeStyleSection = this.extractSection(content, 'Code Style Guidelines');
    if (codeStyleSection) {
      context.codeStyle = this.parseListItems(codeStyleSection);
    }

    // Extract review focus areas
    const reviewFocusSection = this.extractSection(content, 'Review Focus Areas');
    if (reviewFocusSection) {
      context.reviewFocus = this.parseListItems(reviewFocusSection);
    }

    // Extract skip patterns
    const skipPatternsSection = this.extractSection(content, 'Skip Patterns');
    if (skipPatternsSection) {
      context.skipPatterns = this.parseListItems(skipPatternsSection);
    }

    // Extract custom instructions
    const customSection = this.extractSection(content, 'Custom Instructions');
    if (customSection) {
      context.customInstructions = customSection.trim();
    }

    return context;
  }

  /**
   * Extract a section from markdown content
   * @private
   * @param {string} content - Full content
   * @param {string} sectionTitle - Section title to extract
   * @returns {string|null} - Section content
   */
  extractSection(content, sectionTitle) {
    const regex = new RegExp(`##\\s*${sectionTitle}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Parse list items from markdown
   * @private
   * @param {string} content - Content with list items
   * @returns {Array<string>} - Array of list items
   */
  parseListItems(content) {
    const lines = content.split('\n');

    return lines
      .map((line) => {
        // Match bullet points or numbered lists
        const match = line.match(/^[\s-]*[-*]\s+(.+)|^\d+\.\s+(.+)/);
        return match ? (match[1] || match[2]).trim() : null;
      })
      .filter((item) => item !== null);
  }

  /**
   * Merge context skip patterns with default patterns
   * @param {Array<string>} defaultPatterns - Default skip patterns
   * @param {Array<string>} contextPatterns - Patterns from context file
   * @returns {Array<string>} - Merged patterns
   */
  mergeSkipPatterns(defaultPatterns, contextPatterns) {
    if (!contextPatterns || contextPatterns.length === 0) {
      return defaultPatterns;
    }

    // Parse patterns that might have descriptions or markdown formatting
    const parsedContextPatterns = contextPatterns
      .map((pattern) => {
        // Remove markdown code formatting (backticks)
        const cleaned = pattern.replace(/`/g, '');

        // Extract just the pattern if it has a description
        // e.g., "apps/ui-e2e/** (E2E tests)" -> "apps/ui-e2e/**"
        const match = cleaned.match(/^([^\s(]+)/);
        return match ? match[1].trim() : cleaned.trim();
      })
      .filter((pattern) => pattern.length > 0); // Remove empty patterns

    // Combine and deduplicate
    return [...new Set([...defaultPatterns, ...parsedContextPatterns])];
  }

  /**
   * Format context for AI prompt
   * @param {object} context - Parsed context
   * @returns {string} - Formatted context string
   */
  formatForPrompt(context) {
    if (!context) {
      return '';
    }

    let formatted = '# Repository Context\n\n';

    if (context.repoType) {
      formatted += `**Repository Type:** ${context.repoType}\n\n`;
    }

    if (context.projects.length > 0) {
      formatted += '**Project Structure:**\n';
      context.projects.forEach((project) => {
        formatted += `- ${project}\n`;
      });
      formatted += '\n';
    }

    if (context.codeStyle.length > 0) {
      formatted += '**Code Style Guidelines:**\n';
      context.codeStyle.forEach((style) => {
        formatted += `- ${style}\n`;
      });
      formatted += '\n';
    }

    if (context.reviewFocus.length > 0) {
      formatted += '**Review Focus Areas:**\n';
      context.reviewFocus.forEach((focus) => {
        formatted += `- ${focus}\n`;
      });
      formatted += '\n';
    }

    if (context.customInstructions) {
      formatted += `**Additional Instructions:**\n${context.customInstructions}\n\n`;
    }

    return formatted;
  }
}

module.exports = new ContextParser();
