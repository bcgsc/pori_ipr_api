"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('pathwayAnalysis', {
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
    original: {
      type: Sq.TEXT,
      allowNull: true,
    },
    pathway: {
      type: Sq.TEXT,
      allowNull: true,
    },
  },
  {
    // Table Name
    tableName: 'pog_analysis_reports_summary_pathway_analysis',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
  });
};

