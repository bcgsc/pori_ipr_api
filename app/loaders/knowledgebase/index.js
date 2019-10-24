const events = require('./events');
const references = require('./references');

const logger = require('../../log');

// Map of loaders
const loaders = [];

/**
 * Knowledgebase Loaders - Onboards CSV data into SQL databases
 *
 * @param {object} options - Options for dir to use and whether to include events and/or references
 * @returns {Promise.<boolean>} - Returns true if the loader was successfull
 */
module.exports = async (options = {}) => {
  logger.info('KB-Import');
  // Started to onboard a POG Report
  logger.info('Running Knowledge Base Import');

  if (!options.directory) {
    throw new Error('Directory option was not set and is required.');
  }
  if (options.events) {
    loaders.push(events);
  }
  if (options.references) {
    loaders.push(references);
  }

  // Loop over loader files and create promises
  const promises = loaders.map((file) => {
    return file(options.directory, options);
  });

  // Wait for all loaders to finish!
  await Promise.all(promises);
  logger.info('All loaders have completed.');
  return true;
};
