"use strict";

module.exports = (sequelize, Sq) => {
  let outlier = sequelize.define('outlier', {
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
    outlierType: {
      type: Sq.ENUM('clinical', 'nostic', 'biological')
    },
    gene: {
      type: Sq.STRING,
    },
    location: {
      type: Sq.STRING,
    },
    copyChange: {
      type: Sq.STRING,
    },
    lohState: {
      type: Sq.STRING,
    },
    cnvState: {
      type: Sq.STRING,
    },
    rnaReads: {
      type: Sq.STRING
    },
    rpkm: {
      type: Sq.FLOAT,
    },
    foldChange: {
      type: Sq.FLOAT,
    },
    tcgaPerc: {
      type: Sq.INTEGER,
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_expression_outlier',
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

  return outlier;
};

