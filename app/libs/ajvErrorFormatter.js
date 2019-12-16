/**
 * Parses and displays AJV errors in a common format
 *
 * @param {Array.<object>} ajvErrors - Array of errors from ajv.errors
 * @param {object} logger - logger
 * @returns {undefined}
 */
const errorFormatter = (ajvErrors, logger) => {
  ajvErrors.forEach((error) => {
    logger.error(`Message: ${error.message}`);
    logger.error('params:');
    Object.entries(error.params).forEach(([key, value]) => {
      logger.error(`${key}: ${value}`);
    });
  });
};

module.exports = errorFormatter;
