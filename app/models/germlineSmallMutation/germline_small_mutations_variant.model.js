const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('germline_small_mutation_variant', {
    ...DEFAULT_COLUMNS,
    germline_report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'germline_small_mutations',
        key: 'id',
      },
    },
    hidden: {
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    flagged: {
      type: Sq.TEXT,
      allowNull: true,
    },
    clinvar: {
      type: Sq.TEXT,
      allowNull: true,
    },
    cgl_category: {
      type: Sq.TEXT,
      allowNull: true,
    },
    gmaf: {
      type: Sq.TEXT,
      allowNull: true,
    },
    transcript: {
      type: Sq.TEXT,
      allowNull: true,
    },
    gene: {
      type: Sq.TEXT,
      allowNull: false,
    },
    variant: {
      type: Sq.TEXT,
      allowNull: true,
    },
    impact: {
      type: Sq.TEXT,
      allowNull: true,
    },
    chromosome: {
      type: Sq.TEXT,
      allowNull: true,
    },
    position: {
      type: Sq.TEXT,
      allowNull: true,
    },
    dbSNP: {
      type: Sq.TEXT,
      allowNull: true,
    },
    reference: {
      type: Sq.TEXT,
      allowNull: true,
    },
    alteration: {
      type: Sq.TEXT,
      allowNull: true,
    },
    score: {
      type: Sq.TEXT,
      allowNull: true,
    },
    zygosity_germline: {
      type: Sq.TEXT,
      allowNull: true,
    },
    preferred_transcript: {
      type: Sq.BOOLEAN,
      allowNull: true,
    },
    hgvs_cdna: {
      type: Sq.TEXT,
      allowNull: true,
    },
    hgvs_protein: {
      type: Sq.TEXT,
      allowNull: true,
    },
    zygosity_tumour: {
      type: Sq.TEXT,
      allowNull: true,
    },
    genomic_variant_reads: {
      type: Sq.TEXT,
      allowNull: true,
    },
    rna_variant_reads: {
      type: Sq.TEXT,
      allowNull: true,
    },
    gene_somatic_abberation: {
      type: Sq.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sq.TEXT,
      allowNull: true,
    },
    type: {
      type: Sq.TEXT,
      allowNull: true,
    },
    patient_history: {
      type: Sq.TEXT,
      allowNull: true,
    },
    family_history: {
      type: Sq.TEXT,
      allowNull: true,
    },
    tcga_comp_norm_percentile: {
      type: Sq.TEXT,
      allowNull: true,
    },
    tcga_comp_percentile: {
      type: Sq.TEXT,
      allowNull: true,
    },
    gtex_comp_percentile: {
      type: Sq.TEXT,
      allowNull: true,
    },
    fc_bodymap: {
      type: Sq.TEXT,
      allowNull: true,
    },
    gene_expression_rpkm: {
      type: Sq.FLOAT,
      allowNull: true,
    },
    additional_info: {
      type: Sq.TEXT,
      allowNull: true,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations_variant',
    scopes: {
      public: {
        order: [['id', 'ASC']],
        attributes: {
          exclude: ['id', 'germline_report_id', 'deletedAt'],
        },
      },
    },
  });
};
