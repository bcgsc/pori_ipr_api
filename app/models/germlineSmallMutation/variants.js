const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const germlineVariant = sequelize.define('germlineSmallMutationVariant', {
    ...DEFAULT_COLUMNS,
    germlineReportId: {
      name: 'germlineReportId',
      field: 'germline_report_id',
      type: Sq.INTEGER,
      allowNull: false,
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
    cglCategory: {
      name: 'cglCategory',
      field: 'cgl_category',
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
    dbSnpIds: {
      name: 'dbSnpIds',
      field: 'db_snp_ids',
      type: Sq.TEXT,
      allowNull: true,
    },
    clinvarIds: {
      name: 'clinvarIds',
      field: 'clinvar_ids',
      type: Sq.TEXT,
      allowNull: true,
    },
    cosmicIds: {
      name: 'cosmicIds',
      field: 'cosmic_ids',
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
    zygosityGermline: {
      name: 'zygosityGermline',
      field: 'zygosity_germline',
      type: Sq.TEXT,
      allowNull: true,
    },
    preferredTranscript: {
      name: 'preferredTranscript',
      field: 'preferred_transcript',
      type: Sq.BOOLEAN,
      allowNull: true,
    },
    hgvsCdna: {
      name: 'hgvsCdna',
      field: 'hgvs_cdna',
      type: Sq.TEXT,
      allowNull: true,
    },
    hgvsProtein: {
      name: 'hgvsProtein',
      field: 'hgvs_protein',
      type: Sq.TEXT,
      allowNull: true,
    },
    zygosityTumour: {
      name: 'zygosityTumour',
      field: 'zygosity_tumour',
      type: Sq.TEXT,
      allowNull: true,
    },
    genomicVariantReads: {
      name: 'genomicVariantReads',
      field: 'genomic_variant_reads',
      type: Sq.TEXT,
      allowNull: true,
    },
    rnaVariantReads: {
      name: 'rnaVariantReads',
      field: 'rna_variant_reads',
      type: Sq.TEXT,
      allowNull: true,
    },
    geneSomaticAbberation: {
      name: 'geneSomaticAbberation',
      field: 'gene_somatic_abberation',
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
    patientHistory: {
      name: 'patientHistory',
      field: 'patient_history',
      type: Sq.TEXT,
      allowNull: true,
    },
    familyHistory: {
      name: 'familyHistory',
      field: 'family_history',
      type: Sq.TEXT,
      allowNull: true,
    },
    tcgaCompNormPercentile: {
      name: 'tcgaCompNormPercentile',
      field: 'tcga_comp_norm_percentile',
      type: Sq.TEXT,
      allowNull: true,
    },
    tcgaCompPercentile: {
      name: 'tcgaCompPercentile',
      field: 'tcga_comp_percentile',
      type: Sq.TEXT,
      allowNull: true,
    },
    gtexCompPercentile: {
      name: 'gtexCompPercentile',
      field: 'gtex_comp_percentile',
      type: Sq.TEXT,
      allowNull: true,
    },
    fcBodymap: {
      name: 'fcBodymap',
      field: 'fc_bodymap',
      type: Sq.TEXT,
      allowNull: true,
    },
    geneExpressionRpkm: {
      name: 'geneExpressionRpkm',
      field: 'gene_expression_rpkm',
      type: Sq.FLOAT,
      allowNull: true,
    },
    additionalInfo: {
      name: 'additionalInfo',
      field: 'additional_info',
      type: Sq.TEXT,
      allowNull: true,
    },
    previouslyReported: {
      name: 'previously_reported',
      field: 'previously_reported',
      type: Sq.ENUM(['yes', 'no']),
      allowNull: true,
      defaultValue: null,

    },
    cglReviewResult: {
      name: 'cglReviewResult',
      field: 'cgl_review_result',
      type: Sq.ENUM(['pathogenic', 'likely pathogenic', 'VUS', 'likely benign', 'benign']),
    },
    returnedToClinician: {
      name: 'returnedToClinician',
      field: 'returned_to_clinician',
      type: Sq.ENUM(['yes', 'no']),
    },
    referralHcp: {
      name: 'referralHcp',
      field: 'referral_hcp',
      type: Sq.ENUM(['yes', 'no']),
    },
    knownToHcp: {
      name: 'knownToHcp',
      field: 'known_to_hcp',
      type: Sq.ENUM(['yes', 'no']),
    },
    reasonNoHcpReferral: {
      name: 'reasonNoHcpReferral',
      field: 'reason_no_hcp_referral',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations_variant',
    scopes: {
      public: {
        order: [['id', 'ASC']],
        attributes: {
          exclude: ['id', 'germlineReportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  germlineVariant.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, germlineReportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return germlineVariant;
};
