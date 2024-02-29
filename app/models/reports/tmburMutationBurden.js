const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const tmburMutationBurden = sequelize.define('tmburMutationBurden', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    tumour: {
      type: Sq.STRING,
      defaultValue: null,
    },
    normal: {
      type: Sq.STRING,
      defaultValue: null,
    },
    nonNBasesIn1To22AndXAndY: {
      name: 'nonNBasesIn1To22AndXAndY',
      field: 'non_n_bases_in_1_to_22_and_x_and_y',
      type: Sq.TEXT,
      defaultValue: null,
      jsonSchema: {
        description: 'Non N bases in chromosomes 1 to 22 and X and Y',
      },
    },
    totalGenomeSnvs: {
      name: 'totalGenomeSnvs',
      field: 'total_genome_snvs',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'Total Number of Genome Snvs',
      },
    },
    totalGenomeIndels: {
      name: 'totalGenomeIndels',
      field: 'total_genome_indels',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'Total Number of Genome Indels',
      },
    },
    genomeSnvTmb: {
      name: 'genomeSnvTmb',
      field: 'genome_snv_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Genome SNV TMB',
      },
    },
    genomeIndelTmb: {
      name: 'genomeIndelTmb',
      field: 'genome_indel_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Genome Indel TMB',
      },
    },
    adjustedTmb: {
      name: 'adjustedTmb',
      field: 'adjusted_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Adjusted TMB',
      },
    },
    adjustedTmbComment: {
      name: 'adjustedTmbComment',
      field: 'adjusted_tmb_comment',
      type: Sq.TEXT,
      defaultValue: null,
      jsonSchema: {
        description: 'Adjusted TMB Comment',
      },
    },
    cdsBasesIn1To22AndXAndY: {
      name: 'cdsBasesIn1To22AndXAndY',
      field: 'cds_bases_in_1_to_22_and_x_and_y',
      type: Sq.TEXT,
      defaultValue: null,
      jsonSchema: {
        description: 'CDS bases in chromosomes 1 to 22 and X and Y',
      },
    },
    cdsSnvs: {
      name: 'cdsSnvs',
      field: 'cds_snvs',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'CDS Snvs',
      },
    },
    cdsIndels: {
      name: 'cdsIndels',
      field: 'cds_indels',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'CDS Indels',
      },
    },
    cdsSnvTmb: {
      name: 'cdsSnvTmb',
      field: 'cds_snv_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'CDS SNV TMB',
      },
    },
    cdsIndelTmb: {
      name: 'cdsIndelTmb',
      field: 'cds_indel_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'CDS INDEL TMB',
      },
    },
    proteinSnvs: {
      name: 'proteinSnvs',
      field: 'protein_snvs',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'Protein SNVs',
      },
    },
    proteinIndels: {
      name: 'proteinIndels',
      field: 'protein_indels',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'Protein Indels',
      },
    },
    proteinSnvTmb: {
      name: 'proteinSnvTmb',
      field: 'protein_snv_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Protein SNV TMB',
      },
    },
    proteinIndelTmb: {
      name: 'proteinIndelTmb',
      field: 'protein_indel_tmb',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Protein Indel TMB',
      },
    },
    msiScore: {
      name: 'msiScore',
      field: 'msi_score',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'MSI Score',
      },
    },
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
    comments: {
      type: Sq.TEXT,
    },
    displayName: {
      name: 'displayName',
      field: 'display_name',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_tmbur_mutation_burden',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
      extended: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  tmburMutationBurden.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return tmburMutationBurden;
};
