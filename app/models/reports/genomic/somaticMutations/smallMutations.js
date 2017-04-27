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
      type: Sq.STRING,
    },
    transcript: {
      type: Sq.STRING,
    },
    proteinChange: {
      type: Sq.STRING,
    },
    location: {
      type: Sq.STRING,
    },
    refAlt: {
      type: Sq.STRING,
    },
    zygosity: {
      type: Sq.STRING,
    },
    ploidyCorrCpChange: {
      type: Sq.STRING,
    },
    lohState: {
      type: Sq.STRING,
    },
    tumourReads: {
      type: Sq.STRING,
    },
    RNAReads: {
      type: Sq.STRING,
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

