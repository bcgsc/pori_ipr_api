const Ajv = require('ajv');
const isSvg = require('is-svg');
const logger = require('../log');

const ajvCreate = new Ajv({
  useDefaults: true, unknownFormats: ['int32', 'float'], coerceTypes: true, logger,
});

const ajvUpdate = new Ajv({
  useDefaults: false, unknownFormats: ['int32', 'float'], coerceTypes: true, logger,
});

ajvCreate.addFormat('svg', (text) => {
  if (text) {
    return isSvg(text);
  }
  return true;
});

ajvUpdate.addFormat('svg', (text) => {
  if (text) {
    return isSvg(text);
  }
  return true;
});

/**
 * validate an input object/json using a JSON schema
 *
 * @param {object} schema - The JSON schema to use in validating the input object
 * @param {object} data - The object/JSON to be tested for schema compliance
 * @param {boolean} useDefaults - True if validating a create/upload and false for updates
 *
 * @throws {Error} when the input object does not comply to the input schema
 * @returns {undefined}
 */
const validateAgainstSchema = (schema, data, useDefaults = true) => {
  const ajv = (useDefaults) ? ajvCreate : ajvUpdate;
  if (!ajv.validate(schema, data)) {
    const errors = [];

    ajv.errors.forEach((error) => {
      logger.debug(error); // log bad request schema errors for debugging
      const errorParams = Object.entries(error.params).map(([key, value]) => {
        return `${key}: ${value}`;
      }).join(', ');

      errors.push(
        `${error.dataPath ? `${error.dataPath} ${error.message}` : error.message} [${errorParams}]`,
      );
    });

    throw new Error(errors.join('; '));
  }
};


module.exports = validateAgainstSchema;
