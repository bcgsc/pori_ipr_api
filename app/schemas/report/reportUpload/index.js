const db = require('../../../models');
const {BASE_EXCLUDE} = require('../../exclude');
const variantSchemas = require('./variant');
const kbMatchesSchema = require('./kbMatches');
const observedVariantAnnotationsSchema = require('./observedVariantAnnotations');
const schemaGenerator = require('../../schemaGenerator');
const {UPLOAD_BASE_URI} = require('../../../constants');

/**
 * Generate schema for uploading a report
 *
 * @param {boolean} isJsonSchema - Whether to generate a json schema or an openAPI schema
 * @returns {object} - Returns a report upload schema
 */
const generateReportUploadSchema = (isJsonSchema) => {
  // Inject additional properties in the schema
  const properties = {
    project: {
      type: 'string',
      description: 'Project name',
    },
    additionalProjects: {
      type: 'array',
      description: 'Array of additional reports names',
      items: {
        type: 'string',
      },
    },
    template: {
      type: 'string',
      description: 'Template name',
    },
    kbStatementMatchedConditions: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    images: {
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
          },
        },
      },
    },
  };

  const schema = schemaGenerator(db.models.report, {
    isJsonSchema,
    baseUri: UPLOAD_BASE_URI,
    exclude: ['createdBy_id', 'templateId', ...BASE_EXCLUDE],
    associations: true,
    excludeAssociations: ['ReportUserFilter', 'createdBy', 'template', 'signatures', 'presentationDiscussion', 'presentationSlides', 'users', 'projects'],
    properties,
    required: ['project', 'template'],
  });

  // get report associations
  const {
    ReportUserFilter, createdBy, template, signatures, presentationDiscussion,
    presentationSlides, users, projects, ...associations
  } = db.models.report.associations;

  schema.definitions = {...variantSchemas(isJsonSchema), kbMatches: kbMatchesSchema(isJsonSchema), observedVariantAnnotations: observedVariantAnnotationsSchema(isJsonSchema)};

  // add all associated schemas
  Object.values(associations).forEach((association) => {
    const model = association.target.name;

    // generate schemas for the remaining sections
    if (schema.definitions[model] === undefined) {
      const generatedSchema = schemaGenerator(db.models[model], {
        isJsonSchema, baseUri: UPLOAD_BASE_URI, isSubSchema: true,
      });

      if (!generatedSchema.required) {
        generatedSchema.required = [];
      }
      schema.definitions[model] = generatedSchema;
    }
  });

  console.dir(schema.properties);
  return schema;
};

module.exports = generateReportUploadSchema;
