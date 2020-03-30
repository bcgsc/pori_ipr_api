const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../../models');
const {BASE_EXCLUDE} = require('../../exclude');
const variantSchemas = require('./variant');
const kbMatchesSchema = require('./kbMatches');
const {generateReportSubSchema} = require('./util');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(db.models.analysis_report, new JsonSchema7Strategy(), {
  exclude: ['createdBy_id', ...BASE_EXCLUDE],
  associations: true,
  excludeAssociations: ['ReportUserFilter', 'createdBy', 'probe_signature', 'presentation_discussion', 'presentation_slides', 'users', 'analystComments', 'projects'],
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
schema.properties.images = {
  type: 'array',
  items: {
    type: 'object',
    required: ['path', 'key'],
    properties: {
      path: {
        type: 'string', description: 'Absolute path to image file (must be accessible to the report loader user)',
      },
      key: {
        type: 'string',
        pattern: `^${[
          'mutSignature\\.(corPcors|snvsAllStrelka)',
          'subtypePlot\\.\\S+',
          '(cnv|loh)\\.[12345]',
          'cnvLoh.circos',
          'mutation_summary\\.(barplot|density|legend)_(sv|snv|indel)(\\.\\w+)?',
          'circosSv\\.(genome|transcriptome)',
          'expDensity\\.\\S+',
          'expression\\.(chart|legend)',
          'microbial\\.circos\\.(genome|transcriptome)',
        ].map((patt) => { return `(${patt})`; }).join('|')}$`,
      },
    },
  },
};

// get report associations
const {
  ReportUserFilter, createdBy, probe_signature, presentation_discussion,
  presentation_slides, users, analystComments, projects, ...associations
} = db.models.analysis_report.associations;

schema.definitions = {...variantSchemas, kbMatches: kbMatchesSchema};

// add all associated schemas
Object.values(associations).forEach((association) => {
  const model = association.target.name;

  // generate schemas for the remaining sections
  if (schema.definitions[model] === undefined) {
    const generatedSchema = generateReportSubSchema(db.models[model]);

    if (!generatedSchema.required) {
      generatedSchema.required = [];
    }
    schema.definitions[model] = generatedSchema;
  }
});


module.exports = schema;
