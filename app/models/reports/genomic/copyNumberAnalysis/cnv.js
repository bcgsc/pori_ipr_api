"use strict";

module.exports = (sequelize, Sq) => {
  let cnv = sequelize.define('cnv', {
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
    cnvVariant: {
      type: Sq.ENUM('clinical', 'nostic', 'biological', 'commonAmplified', 'homodTumourSupress', 'highlyExpOncoGain', 'lowlyExpTSloss')
    },
    gene: {
      type: Sq.STRING,
    },
    ploidyCorrCpChange: {
      type: Sq.INTEGER,
    },
    lohState: {
      type: Sq.STRING,
    },
    cnvState: {
      type: Sq.STRING,
    },
    chromosomeBand: {
      type: Sq.STRING,
    },
    start: {
      type: Sq.INTEGER,
    },
    end: {
      type: Sq.INTEGER,
    },
    size: {
      type: Sq.FLOAT,
    },
    expressionRpkm: {
      type: Sq.FLOAT,
    },
    foldChange: {
      type: Sq.FLOAT,
    },
    tcgaPerc: {
      type: Sq.FLOAT,
    },
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_copy_number_analysis_cnv',
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

  return cnv;
};

