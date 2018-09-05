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
      type: Sq.TEXT,
    },
    totalIndel: {
      type: Sq.TEXT,
    },
    totalSV: {
      type: Sq.TEXT
    },
    snvPercentileTCGA: {
      type: Sq.INTEGER
    },
    snvPercentileDisease: {
      type: Sq.TEXT
    },
    indelPercentileTCGA: {
      type: Sq.INTEGER
    },
    indelPercentileDisease: {
      type: Sq.TEXT
    },
    svPercentilePOG: {
      type: Sq.INTEGER
    },
    snvPercentileTCGACategory: {
      type: Sq.TEXT
    },
    snvPercentileDiseaseCategory: {
      type: Sq.TEXT
    },
    indelPercentileTCGACategory: {
      type: Sq.TEXT
    },
    indelPercentileDiseaseCategory: {
      type: Sq.TEXT
    },
    svPercentilePOGCategory: {
      type: Sq.TEXT
    },
    snvReportCategory: {
      type: Sq.TEXT
    },
    indelReportCategory: {
      type: Sq.TEXT
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

