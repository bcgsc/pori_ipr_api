"use strict";

module.exports = (sequelize, Sq) => {
  let smallMutations = sequelize.define('smallMutations', {
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
    mutationType: {
      type: Sq.ENUM('clinical', 'nostic', 'biological', 'unknown')
    },
    gene: {
      type: Sq.TEXT,
    },
    transcript: {
      type: Sq.TEXT,
    },
    proteinChange: {
      type: Sq.TEXT,
    },
    location: {
      type: Sq.TEXT,
    },
    refAlt: {
      type: Sq.TEXT,
    },
    zygosity: {
      type: Sq.TEXT,
    },
    ploidyCorrCpChange: {
      type: Sq.TEXT,
    },
    lohState: {
      type: Sq.TEXT,
    },
    tumourReads: {
      type: Sq.TEXT,
    },
    RNAReads: {
      type: Sq.TEXT,
    },
    expressionRpkm: {
      type: Sq.FLOAT,
    },
    foldChange: {
      type: Sq.FLOAT,
    },
    TCGAPerc: {
      type: Sq.INTEGER,
    },
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_somatic_mutations_small_mutations',
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

  return smallMutations;
};

