const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../../models');
const {GENE_LINKED_VARIANT_MODELS} = require('../../../constants');
const {BASE_EXCLUDE} = require('../../exclude');
const schemaGenerator = require('./basicReportComponentSchemaGenerator');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const REPORT_EXCLUDE = ['createdBy_id'];
const exclude = BASE_EXCLUDE.concat(REPORT_EXCLUDE);

const schema = schemaManager.generate(db.models.analysis_report, new JsonSchema7Strategy(), {
  exclude,
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

schema.definitions = {};

// add all associated schemas
Object.values(associations).forEach((association) => {
  const model = association.target.name;
  const generatedSchema = schemaGenerator(db.models[model]);

  if (!generatedSchema.required) {
    generatedSchema.required = [];
  }
  schema.definitions[model] = generatedSchema;
});


schema.definitions.kbMatches = schemaGenerator(db.models.kbMatches, ['variantId']);
schema.definitions.kbMatches.properties.variant = {
  type: 'string', description: 'the variant key linking this to one of the variant records',
};
schema.definitions.kbMatches.required = schema.definitions.kbMatches.required || [];
schema.definitions.kbMatches.required.push('variant');

schema.definitions.structuralVariants.properties = {
  ...schema.definitions.structuralVariants.properties,
  gene1: {
    type: 'string', description: 'The gene name for the first breakpoint',
  },
  gene2: {
    type: 'string', description: 'The gene name for the second breakpoint',
  },
  key: {
    type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
  },
};
schema.definitions.structuralVariants.required.push(...['gene1', 'gene2']);

GENE_LINKED_VARIANT_MODELS.filter((model) => { return model !== 'structuralVariants'; }).forEach((model) => {
  schema.definitions[model].properties = {
    ...schema.definitions[model].properties,
    gene: {
      type: 'string', description: 'The gene name for this variant',
    },
    key: {
      type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
    },
  };
  schema.definitions[model].required.push('gene');
});

module.exports = schema;
