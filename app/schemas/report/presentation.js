const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const EXCLUDE = require('../exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const discussionSchema = schemaManager.generate(db.models.presentation_discussion, new JsonSchema7Strategy(), {
  exclude: ['user_id', ...EXCLUDE.REPORT_EXCLUDE],
  associations: false,
});

discussionSchema.additionalProperties = false;


const slideSchema = schemaManager.generate(db.models.presentation_slides, new JsonSchema7Strategy(), {
  exclude: [...EXCLUDE.BASE_EXCLUDE],
  associations: false,
});

slideSchema.additionalProperties = false;
slideSchema.required = ['object', ...slideSchema.required];

module.exports = {
  discussionSchema,
  slideSchema,
};
