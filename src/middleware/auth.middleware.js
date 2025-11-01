/**
 * Authentication middleware
 */
const { AuthenticationError } = require('../utils/errors');

module.exports = (req, res, next) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');

  // If API_KEY is not configured, skip auth
  if (!process.env.API_KEY) {
    return next();
  }

  if (!apiKey || apiKey !== process.env.API_KEY) {
    throw new AuthenticationError('Invalid or missing API key');
  }

  req.user = 'api-user';
  next();
};
