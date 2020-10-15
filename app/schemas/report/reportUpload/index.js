const db = require('../../../models');
const {BASE_EXCLUDE} = require('../../exclude');
const variantSchemas = require('./variant');
const kbMatchesSchema = require('./kbMatches');
const schemaGenerator = require('../../schemaGenerator');
const {VALID_IMAGE_KEY_PATTERN, UPLOAD_BASE_URI} = require('../../../constants');


/**
 * Generate schema for uploading a report
 *
 * @param {boolean} isJsonSchema - Whether to generate a json schema or an openAPI schema
 * @returns {object} - Returns a report upload schema
 */
const generateReportUploadSchema = (isJsonSchema) => {
  const schema = schemaGenerator(db.models.analysis_report, {
    isJsonSchema,
    baseUri: UPLOAD_BASE_URI,
    exclude: ['createdBy_id', ...BASE_EXCLUDE],
    associations: true,
    excludeAssociations: ['ReportUserFilter', 'createdBy', 'signatures', 'presentationDiscussion', 'presentationSlides', 'users', 'projects'],
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
          pattern: VALID_IMAGE_KEY_PATTERN,
        },
      },
    },
  };

  // get report associations
  const {
    ReportUserFilter, createdBy, signatures, presentationDiscussion,
    presentationSlides, users, projects, ...associations
  } = db.models.analysis_report.associations;

  schema.definitions = {...variantSchemas(isJsonSchema), kbMatches: kbMatchesSchema(isJsonSchema)};

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

  return schema;
};


module.exports = generateReportUploadSchema;
