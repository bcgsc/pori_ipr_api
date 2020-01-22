/**
 * Parses and displays AJV errors in a common format
 *
 * @param {Array.<object>} ajvErrors - Array of errors from ajv.errors
 * @param {object} logger - logger
 * @returns {undefined}
 */
const errorFormatter = (ajvErrors, logger) => {
  ajvErrors.forEach((error) => {
    logger.error(error);
  });
};

module.exports = errorFormatter;
