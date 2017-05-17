"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('mutationSummary', {
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
    mutationSignature: {
      type: Sq.JSONB,
      defaultValue: [],
    },
    totalSNV: {
      type: Sq.STRING,
    },
    totalIndel: {
      type: Sq.STRING,
    },
    totalSV: {
      type: Sq.STRING
    },
    snvPercentileTCGA: {
      type: Sq.INTEGER
    },
    snvPercentileDisease: {
      type: Sq.STRING
    },
    indelPercentileTCGA: {
      type: Sq.INTEGER
    },
    indelPercentileDisease: {
      type: Sq.STRING
    },
    svPercentilePOG: {
      type: Sq.INTEGER
    },
    snvPercentileTCGACategory: {
      type: Sq.STRING
    },
    snvPercentileDiseaseCategory: {
      type: Sq.STRING
    },
    indelPercentileTCGACategory: {
      type: Sq.STRING
    },
    indelPercentileDiseaseCategory: {
      type: Sq.STRING
    },
    svPercentilePOGCategory: {
      type: Sq.STRING
    },
    snvReportCategory: {
      type: Sq.STRING
    },
    indelReportCategory: {
      type: Sq.STRING
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_summary_mutation_summary',
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

