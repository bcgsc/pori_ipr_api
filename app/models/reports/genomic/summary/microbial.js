"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('summary_microbial', {
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
    pog_report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'pog_analysis_reports',
        key: 'id',
      }
    },
    species: {
      type: Sq.STRING,
    },
    integrationSite: {
      type: Sq.STRING,
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_summary_microbial',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'pog_report_id', 'deletedAt']
        },
      }
    }
  });
};

