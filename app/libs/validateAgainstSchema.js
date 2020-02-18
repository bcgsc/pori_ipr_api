const Ajv = require('ajv');

const logger = require('../log');

const ajv = new Ajv({
  useDefaults: true, unknownFormats: ['int32', 'float'], coerceTypes: true, logger,
});


const validateAgainstSchema = (schema, testInputObject) => {
  if (!ajv.validate(schema, testInputObject)) {
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
