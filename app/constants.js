

module.exports = {
  UUIDregex: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
  KB_PIVOT_MAPPING: {
    sv: 'structuralVariants',
    cnv: 'copyVariants',
    mut: 'smallMutations',
    exp: 'expressionVariants',
  },
  KB_PIVOT_COLUMN: 'variantType',
  GENE_LINKED_VARIANT_MODELS: ['expressionVariants', 'smallMutations', 'copyVariants', 'structuralVariants', 'probeResults'],
};
