/**
 * Application configuration
 * Loads and validates environment variables
 */

require('dotenv').config();
const Joi = require('joi');

// Configuration schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  // GitLab
  GITLAB_TOKEN: Joi.string().required(),
  GITLAB_URL: Joi.string().uri().default('https://gitlab.com'),
  GITLAB_WEBHOOK_SECRET: Joi.string().optional(),

  // Dify
  DIFY_API_KEY: Joi.string().required(),
  DIFY_API_URL: Joi.string().uri().default('https://api.dify.ai/v1'),
  DIFY_USER: Joi.string().default('gitlab-bot'),

  // Review settings
  MAX_FILES_PER_REVIEW: Joi.number().default(20),
  MAX_DIFF_SIZE: Joi.number().default(5000),
  ENABLE_INLINE_COMMENTS: Joi.boolean().default(false),
  SKIP_PATTERNS: Joi.string().default('node_modules,dist,build,*.lock'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // RAG
  RAG_KNOWLEDGE_BASE: Joi.string().default('frontend-best-practices'),
  RAG_ENABLED: Joi.boolean().default(true),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export configuration object
module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  logLevel: envVars.LOG_LEVEL,

  gitlab: {
    token: envVars.GITLAB_TOKEN,
    url: envVars.GITLAB_URL,
    webhookSecret: envVars.GITLAB_WEBHOOK_SECRET,
  },

  dify: {
    apiKey: envVars.DIFY_API_KEY,
    apiUrl: envVars.DIFY_API_URL,
    user: envVars.DIFY_USER,
  },

  review: {
    maxFilesPerReview: envVars.MAX_FILES_PER_REVIEW,
    maxDiffSize: envVars.MAX_DIFF_SIZE,
    enableInlineComments: envVars.ENABLE_INLINE_COMMENTS,
    skipPatterns: envVars.SKIP_PATTERNS.split(',').map((p) => p.trim()),
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },

  rag: {
    knowledgeBase: envVars.RAG_KNOWLEDGE_BASE,
    enabled: envVars.RAG_ENABLED,
  },

  cors: {
    origin: envVars.CORS_ORIGIN,
  },
};
