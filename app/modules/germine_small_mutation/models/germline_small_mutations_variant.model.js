"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('germline_small_mutation', {
      id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ident: {
        type: Sq.UUID,
        unique: true,
        defaultValue: Sq.UUIDV4
      },
      germline_report_id: {
        type: Sq.INTEGER,
        required: true,
        references: {
          model: 'pog_analysis_germline_small_mutations',
          key: 'id',
        }
      },
      flagged: {
        type: Sq.STRING,
        allowNull: false,
      },
      clinvar: {
        type: Sq.STRING,
        allowNull: false,
      },
      cgl_category: {
        type: Sq.STRING,
        allowNull: false,
      },
      gmaf: {
        type: Sq.STRING,
        allowNull: false,
      },
      transcript: {
        type: Sq.STRING,
        allowNull: false,
      },
      gene: {
        type: Sq.STRING,
        allowNull: false,
      },
      variant: {
        type: Sq.STRING,
        allowNull: false,
      },
      impact: {
        type: Sq.STRING,
        allowNull: false,
      },
      chromosome: {
        type: Sq.STRING,
        allowNull: false,
      },
      position: {
        type: Sq.STRING,
        allowNull: false,
      },
      dbSNP: {
        type: Sq.STRING,
        allowNull: false,
      },
      reference: {
        type: Sq.STRING,
        allowNull: false,
      },
      alteration: {
        type: Sq.STRING,
        allowNull: false,
      },
      scopre: {
        type: Sq.STRING,
        allowNull: false,
      },
      zygosity_germline: {
        type: Sq.STRING,
        allowNull: false,
      },
      hgvs_cdna: {
        type: Sq.STRING,
        allowNull: false,
      },
      hgvs_protein: {
        type: Sq.STRING,
        allowNull: false,
      },
      zygosity_tumour: {
        type: Sq.STRING,
        allowNull: false,
      },
      genomic_variant_reads: {
        type: Sq.STRING,
        allowNull: false,
      },
      rna_variant_reads: {
        type: Sq.STRING,
        allowNull: false,
      },
      gene_somatic_abberation: {
        type: Sq.STRING,
        allowNull: false,
      },
      notes: {
        type: Sq.STRING,
        allowNull: false,
      },
      type: {
        type: Sq.STRING,
        allowNull: false,
      },
      patient_history: {
        type: Sq.STRING,
        allowNull: false,
      },
      family_history: {
        type: Sq.STRING,
        allowNull: false,
      },
      tcga_comp: {
        type: Sq.STRING,
        allowNull: false,
      },
      tcga_comp_average_percentile: {
        type: Sq.STRING,
        allowNull: false,
      },
      tcga_comp_average_norm_percentile: {
        type: Sq.STRING,
        allowNull: false,
      },
      tcga_comp_norm_percentile: {
        type: Sq.STRING,
        allowNull: false,
      },
      tcaga_comp_percentile: {
        type: Sq.STRING,
        allowNull: false,
      },
      gtex_comp: {
        type: Sq.STRING,
        allowNull: false,
      },
      gtex_comp_average_percentile: {
        type: Sq.STRING,
        allowNull: false,
      },
      gtex_comp_percentile: {
        type: Sq.FLOAT,
        allowNull: false,
      },
      fc_mean_bodymap: {
        type: Sq.FLOAT,
        allowNull: false,
      },
      fc_liver_bodymap: {
        type: Sq.FLOAT,
        allowNull: false,
      },
      gene_expression_rpkm: {
        type: Sq.FLOAT,
        allowNull: false,
      },
      additional_info: {
        type: Sq.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'pog_analysis_germline_small_mutations_variant',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          order:  [['id', 'ASC']],
          attributes: {
            exclude: ['deletedAt', 'id', 'germline_report_id']
          },
        }
      }
    });
};

