"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('germline_small_mutation_variant', {
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
        allowNull: true,
      },
      clinvar: {
        type: Sq.STRING,
        allowNull: true,
      },
      cgl_category: {
        type: Sq.STRING,
        allowNull: true,
      },
      gmaf: {
        type: Sq.STRING,
        allowNull: true,
      },
      transcript: {
        type: Sq.STRING,
        allowNull: true,
      },
      gene: {
        type: Sq.STRING,
        allowNull: false,
      },
      variant: {
        type: Sq.STRING,
        allowNull: true,
      },
      impact: {
        type: Sq.STRING,
        allowNull: true,
      },
      chromosome: {
        type: Sq.STRING,
        allowNull: true,
      },
      position: {
        type: Sq.STRING,
        allowNull: true,
      },
      dbSNP: {
        type: Sq.STRING,
        allowNull: true,
      },
      reference: {
        type: Sq.STRING,
        allowNull: true,
      },
      alteration: {
        type: Sq.STRING,
        allowNull: true,
      },
      score: {
        type: Sq.STRING,
        allowNull: true,
      },
      zygosity_germline: {
        type: Sq.STRING,
        allowNull: true,
      },
      preferred_transcript: {
        type: Sq.BOOLEAN,
        allowNull: true
      },
      hgvs_cdna: {
        type: Sq.STRING,
        allowNull: true,
      },
      hgvs_protein: {
        type: Sq.STRING,
        allowNull: true,
      },
      zygosity_tumour: {
        type: Sq.STRING,
        allowNull: true,
      },
      genomic_variant_reads: {
        type: Sq.STRING,
        allowNull: true,
      },
      rna_variant_reads: {
        type: Sq.STRING,
        allowNull: true,
      },
      gene_somatic_abberation: {
        type: Sq.STRING,
        allowNull: true,
      },
      notes: {
        type: Sq.TEXT,
        allowNull: true,
      },
      type: {
        type: Sq.STRING,
        allowNull: true,
      },
      patient_history: {
        type: Sq.STRING,
        allowNull: true,
      },
      family_history: {
        type: Sq.STRING,
        allowNull: true,
      },
      tcga_comp: {
        type: Sq.STRING,
        allowNull: true,
      },
      tcga_comp_average_percentile: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      tcga_comp_average_norm_percentile: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      tcga_comp_norm_percentile: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      tcga_comp_percentile: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      gtex_comp: {
        type: Sq.STRING,
        allowNull: true,
      },
      gtex_comp_average_percentile: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      gtex_comp_percentile: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      fc_mean_bodymap: {
        type: Sq.FLOAT,
        allowNull: true,
      },
      fc_liver_bodymap: {
        type: Sq.FLOAT,
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

