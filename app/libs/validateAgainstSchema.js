const Ajv = require('ajv');
const isSvg = require('is-svg');
const logger = require('../log');

const ajv = new Ajv({
  useDefaults: true, unknownFormats: ['int32', 'float'], coerceTypes: true, logger,
});

ajv.addFormat('svg', (text) => {
  if (text) {
    return isSvg(text);
  }
  return true;
});

/**
 * validate an input object/json using a JSON schema
 *
 * @param {object} schema the JSON schema to use in validating the input object
 * @param {object} data the object/JSON to be tested for schema compliance
 *
 * @throws {Error} when the input object does not comply to the input schema
 * @returns {undefined}
 */
const validateAgainstSchema = (schema, data) => {
  if (!ajv.validate(schema, data)) {
    const errors = [];

    ajv.errors.forEach((error) => {
      logger.debug(error); // log bad request schema errors for debugging
      errors.push(
        error.dataPath
          ? `${error.dataPath} ${error.message}`
          : error.message
      );
    });

    throw new Error(`Error validating schema: ${errors.join('; ')}`);
  }
};


module.exports = validateAgainstSchema;
