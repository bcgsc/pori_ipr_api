const db = require('../../../models');
const schemaGenerator = require('../../schemaGenerator');
const {GENE_LINKED_VARIANT_MODELS, UPLOAD_BASE_URI} = require('../../../constants');
const {REPORT_EXCLUDE} = require('../../exclude');

/**
 * Generate upload schemas for all variants
 *
 * @param {boolean} isJsonSchema - Whether generating a json schema or an openAPI schema
 * @returns {object} - Returns variant upload schemas
 */
const generateVariantUploadSchemas = (isJsonSchema) => {
  const variantSchemas = {
    structuralVariants: schemaGenerator(db.models.structuralVariants, {
      isJsonSchema,
      baseUri: UPLOAD_BASE_URI,
      properties: {
        gene1: {
          type: 'string', description: 'The gene name for the first breakpoint',
        },
        gene2: {
          type: 'string', description: 'The gene name for the second breakpoint',
        },
        key: {
          type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
        },
      },
      isSubSchema: true,
      required: ['gene1', 'gene2'],
      exclude: [...REPORT_EXCLUDE, 'gene1Id', 'gene2Id'],
    }),
  };

  GENE_LINKED_VARIANT_MODELS.filter((model) => {
    return model !== 'structuralVariants';
  }).forEach((model) => {
    variantSchemas[model] = schemaGenerator(db.models[model], {
      isJsonSchema,
      baseUri: UPLOAD_BASE_URI,
      properties: {
        gene: {
          type: 'string', description: 'The gene name for this variant',
        },
        key: {
          type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
        },
      },
      isSubSchema: true,
      required: ['gene'],
    });
  });

  variantSchemas.msi = schemaGenerator(db.models.msi, {
    isJsonSchema,
    baseUri: UPLOAD_BASE_URI,
    properties: {
      key: {
        type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
      },
    },
    isSubSchema: true,
  });

  variantSchemas.tmburMutationBurden = schemaGenerator(db.models.tmburMutationBurden, {
    isJsonSchema,
    baseUri: UPLOAD_BASE_URI,
    properties: {
      key: {
        type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
      },
    },
    isSubSchema: true,
  });

  return variantSchemas;
};

module.exports = generateVariantUploadSchemas;
