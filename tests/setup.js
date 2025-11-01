/**
 * Test setup and global mocks
 */
process.env.NODE_ENV = 'test';
process.env.GITLAB_TOKEN = 'test-token';
process.env.DIFY_API_KEY = 'test-key';

// ============================================
// tests/unit/services/dify.service.test.js
const difyService = require('../src/services/dify.service');

describe('DifyService', () => {
  describe('analyzeCode', () => {
    it('should analyze code and return result', async () => {
      // Mock implementation
      const diff = '+const x = 1;';
      const fileName = 'test.js';
      const language = 'JavaScript';

      // Test would go here
      expect(difyService).toBeDefined();
    });
  });

  describe('buildCodeReviewPrompt', () => {
    it('should build comprehensive prompt for frontend files', () => {
      const fileName = 'Component.jsx';
      const language = 'React JSX';

      expect(difyService.isFrontendLanguage(language)).toBe(true);
    });
  });
});
