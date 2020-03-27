const db = require('../../../models');
const {generateReportSubSchema} = require('./util');
const {GENE_LINKED_VARIANT_MODELS} = require('../../../constants');

const variantSchemas = {
  structuralVariants: generateReportSubSchema(db.models.structuralVariants, {
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
    required: ['gene1', 'gene2'],
  }),
};

GENE_LINKED_VARIANT_MODELS.filter((model) => { return model !== 'structuralVariants'; }).forEach((model) => {
  variantSchemas[model] = generateReportSubSchema(
    db.models[model],
    {
      properties: {
        gene: {
          type: 'string', description: 'The gene name for this variant',
        },
        key: {
          type: 'string', description: 'Unique identifier for this variant within this section used to link it to kb-matches',
        },
      },
      required: ['gene'],
    }
  );
});


module.exports = variantSchemas;
