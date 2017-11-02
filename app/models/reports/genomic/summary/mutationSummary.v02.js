"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('mutationSummaryv2', {
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
    comparator: {
      type: Sq.STRING,
      defaultValue: null
    },
    snv: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    snv_truncating: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    indels: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    indels_frameshift: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    sv: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    sv_expressed: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    snv_percentile: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    indel_percentile: {
      type: Sq.INTEGER,
      defaultValue: null
    },
    sv_percentile: {
      type: Sq.INTEGER,
      defaultValue: null
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_summary_mutation',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'pog_id', 'pog_report_id', 'deletedAt']
        },
      }
    }
  });
};

