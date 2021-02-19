

module.exports = {
  UUIDregex: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
  KB_PIVOT_MAPPING: {
    sv: 'structuralVariants',
    cnv: 'copyVariants',
    mut: 'smallMutations',
    exp: 'expressionVariants',
    protein: 'proteinVariants',
  },
  KB_PIVOT_COLUMN: 'variantType',
  GENE_LINKED_VARIANT_MODELS: [
    'expressionVariants',
    'smallMutations',
    'copyVariants',
    'structuralVariants',
    'probeResults',
    'proteinVariants',
  ],
  VALID_IMAGE_KEY_PATTERN: `^${[
    'mutSignature\\.(corPcors|barplot)\\.(dbs|indels|sbs)',
    'subtypePlot\\.\\S+',
    '(cnv|loh)\\.[12345]',
    'cnvLoh.circos',
    'mutationBurden\\.(barplot|density|legend)_(sv|snv|indel|snv_indel)\\.(primary|secondary|tertiary|quaternary)',
    'circosSv\\.(genome|transcriptome)',
    'expDensity\\.\\S+',
    'expression\\.(chart|legend)',
    'microbial\\.circos\\.(genome|transcriptome)',
    'cibersort\\.(cd8_positive|combined)_t-cell_scatter',
    'mixcr\\.circos_trb_vj_gene_usage',
    'mixcr\\.dominance_vs_alpha_beta_t-cells_scatter',
    'scpPlot',
    'msi.scatter',
    'pathwayAnalysis.legend',
  ].map((patt) => {
    return `(${patt})`;
  }).join('|')}$`,
  REPORT_CREATE_BASE_URI: '/reports/create',
  REPORT_UPDATE_BASE_URI: '/reports/update',
  GERMLINE_CREATE_BASE_URI: '/germline/create',
  GERMLINE_UPDATE_BASE_URI: '/germline/update',
  UPLOAD_BASE_URI: '/upload',
  DEFAULT_LOGO_HEIGHT: 64,
  DEFAULT_LOGO_WIDTH: 64,
  DEFAULT_HEADER_HEIGHT: 96,
  DEFAULT_HEADER_WIDTH: 300,
};
