/**
 * Main application entry point
 * Configures Express server with middleware and routes
 */

require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const rateLimitMiddleware = require('./middleware/rateLimit.middleware');

const app = express();

// Trust proxy for proper IP detection behind load balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Global rate limiting
app.use(rateLimitMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Readiness probe
app.get('/ready', (req, res) => {
  // Add checks for external dependencies if needed
  res.json({ status: 'ready' });
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}

# HELP nodejs_heap_size_used_bytes Used heap size
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}

# HELP process_cpu_user_seconds_total User CPU time
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${process.cpuUsage().user / 1000000}
  `.trim());
});

// API routes
app.use('/api', routes);

// Webhook route (special case, no /api prefix)
app.use('/webhook', require('./routes/webhook.routes'));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connections, clear timeouts, etc.
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    environment: config.env,
    nodeVersion: process.version,
    pid: process.pid,
  });
  logger.info(`Webhook URL: http://localhost:${PORT}/webhook/gitlab`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
