"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('alterations', {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    ident: {
      type: Sq.UUID,
      unique: false,
      defaultValue: Sq.UUIDV4
    },
    dataVersion: {
      type: Sq.INTEGER,
      defaultValue: 0,
    },
    pog_id: {
      type: Sq.INTEGER,
      references: {
        model: 'POGs',
        key: 'id',
      }
    },
    pog_report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'pog_analysis_reports',
        key: 'id',
      }
    },
    reportType: {
      type: Sq.ENUM('genomic', 'probe'),
      defaultValue: 'genomic'
    },
    alterationType: {
      type: Sq.ENUM('therapeutic', 'prognostic', 'diagnostic', 'biological', 'unknown'),
      allowNull: false
    },
    newEntry: {
      type: Sq.BOOLEAN,
      defaultValue: true,
    },
    approvedTherapy: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    },
    gene: {
      type: Sq.STRING
    },
    variant: {
      type: Sq.STRING,
    },
    kbVariant: {
      type: Sq.STRING
    },
    disease: {
      type: Sq.STRING,
    },
    effect: {
      type: Sq.TEXT,
    },
    association: {
      type: Sq.STRING,
    },
    therapeuticContext: {
      type: Sq.STRING,
    },
    status: {
      type: Sq.STRING,
    },
    reference: {
      type: Sq.STRING,
    },
    expression_tissue_fc: {
      type: Sq.STRING,
    },
    expression_cancer_percentile: {
      type: Sq.STRING,
    },
    copyNumber: {
      type: Sq.STRING,
    },
    sample: {
      type: Sq.STRING,
    },
    LOHRegion: {
      type: Sq.STRING,
    },
    zygosity: {
      type: Sq.STRING,
    },
    evidence: {
      type: Sq.STRING,
    },
    matched_cancer: {
      type: Sq.STRING,
    },
    pmid_ref: {
      type: Sq.STRING,
    },
    variant_type: {
      type: Sq.STRING,
    },
    kb_type: {
      type: Sq.STRING,
    },
    kb_entry_type: {
      type: Sq.STRING,
    },
    kb_event_key: {
      type: Sq.STRING,
    },
    kb_entry_key: {
      type: Sq.TEXT,
    },
    kb_data: {
      type: Sq.JSONB
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_dga_alterations',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {exclude: ['id', 'deletedAt', 'pog_report_id', 'pog_id']}
      }
    }
  });
};

