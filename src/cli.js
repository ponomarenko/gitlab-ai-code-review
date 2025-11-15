#!/usr/bin/env node

/**
 * CLI Entry Point
 * Provides command-line interface for GitLab AI Code Review
 */

const { program } = require('commander');
const logger = require('./utils/logger');
const config = require('./config');
const packageJson = require('../package.json');

// Import commands
const serverCommand = require('./commands/server.command');
const reviewCommand = require('./commands/review.command');
const healthCommand = require('./commands/health.command');
const configCommand = require('./commands/config.command');

// Configure CLI
program
  .name('gitlab-ai-review')
  .description('AI-powered code review bot for GitLab with RAG support')
  .version(packageJson.version)
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-error output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.LOG_LEVEL = 'debug';
    }
    if (opts.quiet) {
      process.env.LOG_LEVEL = 'error';
    }
  });

// Server command
program
  .command('server')
  .alias('start')
  .description('Start the webhook server')
  .option('-p, --port <port>', 'Server port', config.port.toString())
  .option('-h, --host <host>', 'Server host', '0.0.0.0')
  .action(serverCommand);

// Review command (manual trigger)
program
  .command('review')
  .description('Manually trigger a code review for a merge request')
  .requiredOption('-p, --project <id>', 'GitLab project ID')
  .requiredOption('-m, --mr <iid>', 'Merge request IID')
  .option('-f, --force', 'Force review even if already reviewed')
  .action(reviewCommand);

// Health check command
program
  .command('health')
  .description('Check service health and connectivity')
  .option('--gitlab', 'Check GitLab connectivity')
  .option('--dify', 'Check Dify API connectivity')
  .option('--all', 'Check all services')
  .action(healthCommand);

// Config command
program
  .command('config')
  .description('Display current configuration')
  .option('--validate', 'Validate configuration only')
  .option('--json', 'Output as JSON')
  .action(configCommand);

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  if (error.code === 'commander.help') {
    process.exit(0);
  }
  if (error.code === 'commander.version') {
    process.exit(0);
  }
  logger.error('CLI error', { error: error.message });
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
