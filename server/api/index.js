/**
 * Vercel Serverless entry point
 * Re-exports the Express app so Vercel can route requests to it.
 */
const { app } = require('../index');

module.exports = app;
