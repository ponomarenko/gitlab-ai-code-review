/**
 * Prompt Template Loader
 * Loads and processes prompt templates from knowledge-base/prompts
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class PromptLoader {
  constructor() {
    this.promptsDir = path.join(__dirname, '../../knowledge-base/prompts');
    this.cache = new Map();
  }

  /**
   * Load prompt template from file
   * @param {string} templateName - Name of the template file (without .md extension)
   * @returns {string} - Template content
   */
  loadTemplate(templateName) {
    // Check cache first
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    try {
      const filePath = path.join(this.promptsDir, `${templateName}.md`);
      const template = fs.readFileSync(filePath, 'utf8');

      // Cache the template
      this.cache.set(templateName, template);

      logger.debug('Loaded prompt template', { templateName });
      return template;
    } catch (error) {
      logger.error('Failed to load prompt template', {
        templateName,
        error: error.message,
      });
      throw new Error(`Failed to load prompt template: ${templateName}`);
    }
  }

  /**
   * Process template with variables
   * Simple template engine that replaces {{variable}} with values
   * Supports conditional blocks: {{#if variable}}content{{/if}}
   *
   * @param {string} template - Template content
   * @param {object} variables - Variables to replace
   * @returns {string} - Processed template
   */
  processTemplate(template, variables = {}) {
    let processed = template;

    // Process conditional blocks first: {{#if variable}}content{{/if}}
    processed = processed.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, varName, content) => {
        const value = variables[varName];
        // Include content if variable is truthy and not empty string
        return value && value !== '' ? content : '';
      }
    );

    // Replace simple variables: {{variable}}
    processed = processed.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      return value !== undefined && value !== null ? value : '';
    });

    return processed;
  }

  /**
   * Load and process a prompt template
   * @param {string} templateName - Name of the template
   * @param {object} variables - Variables to replace in template
   * @returns {string} - Processed prompt
   */
  getPrompt(templateName, variables = {}) {
    const template = this.loadTemplate(templateName);
    return this.processTemplate(template, variables);
  }

  /**
   * Clear template cache (useful for development/testing)
   */
  clearCache() {
    this.cache.clear();
    logger.debug('Prompt template cache cleared');
  }
}

module.exports = new PromptLoader();
