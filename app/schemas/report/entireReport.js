const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../exclude');
const schemaGenerator = require('./basicReportComponentSchemaGenerator');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const REPORT_EXCLUDE = ['pog_id', 'analysis_id', 'createdBy_id'];
const exclude = BASE_EXCLUDE.concat(REPORT_EXCLUDE);

const schema = schemaManager.generate(db.models.analysis_report, new JsonSchema7Strategy(), {
  exclude,
  associations: true,
  excludeAssociations: ['ReportUserFilter', 'createdBy', 'probe_signature', 'presentation_discussion', 'presentation_slides', 'users', 'analystComments'],
});

// set schema version and don't allow additional properties
schema.additionalProperties = false;

// inject all required associations into schema
schema.properties.project = {
  type: 'string',
  description: 'Project name',
};
schema.required.push('project');

// inject image directory
schema.properties.imagesDirectory = {
  type: 'string',
  description: 'Absolute path to images directory',
};

// get report associations
const {
  ReportUserFilter, createdBy, probe_signature, presentation_discussion,
  presentation_slides, users, analystComments, ...associations
} = db.models.analysis_report.associations;

schema.definitions = {};
// add all associated schemas
Object.values(associations).forEach((association) => {
  const model = association.target.name;

  const generatedSchema = schemaGenerator(db.models[model]);
  // remove association schema draft versions
  delete generatedSchema.$schema;

  schema.definitions[model] = generatedSchema;
});

module.exports = schema;
