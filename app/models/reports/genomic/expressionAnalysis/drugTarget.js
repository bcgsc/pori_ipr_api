"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('drugTarget', {
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
    gene: {
      type: Sq.STRING,
    },
    copy: {
      type: Sq.INTEGER,
    },
    lohRegion: {
      type: Sq.STRING,
    },
    foldChange: {
      type: Sq.FLOAT,
    },
    tcgaPerc: {
      type: Sq.INTEGER,
    },
    drugOptions: {
      type: Sq.TEXT
    },
    kIQR: {
      type: Sq.STRING,
    },
    kIQRColumn: {
      type: Sq.STRING,
    },
    kIQRNormal: {
      type: Sq.STRING,
    },
    kIQRNormalColumn: {
      type: Sq.STRING,
    },
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_expression_drug_target',
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

