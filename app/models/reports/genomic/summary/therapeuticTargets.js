"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('therapeuticTarget', {
      id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    ident: {
      type: Sq.UUID,
      defaultValue: Sq.UUIDV4
    },
    dataVersion: {
      type: Sq.INTEGER,
      defaultValue: 0
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
    type: {
      type: Sq.ENUM('therapeutic','chemoresistance'),
      allowNull: false
    },
    rank: {
      type: Sq.INTEGER,
      defaultValue: 0
    },
    target: {
      type: Sq.JSONB,
      allowNull: true
    },
    targetContext: {
      type: Sq.STRING,
      allowNull: true
    },
    resistance: {
      type: Sq.STRING,
      allowNull: true
    },
    biomarker: {
      type: Sq.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    notes: {
      type: Sq.TEXT
    }
  },
  {
    tableName: 'pog_analysis_reports_therapeutic_targets',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes
    paranoid: true,
  });
};

