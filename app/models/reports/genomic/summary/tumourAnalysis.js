"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tumourAnalysis', {
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
    tumourContent: {
      type: Sq.INTEGER,
      allowNull: false,
    },
    ploidy: {
      type: Sq.STRING,
      allowNull: false,
    },
    normalExpressionComparator: {
      type: Sq.STRING,
    },
    diseaseExpressionComparator: {
      type: Sq.STRING,
    },
    subtyping: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
    tcgaColor: {
      type: Sq.STRING,
    },
    mutationSignature: {
      type: Sq.JSONB,
      defaultValue: []
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_summary_tumour_analysis',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt', 'pog_report_id', 'id', 'pog_id']
        },
      }
    }
  });
};

