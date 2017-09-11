"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('outlier', {
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
    expType: {
      type: Sq.STRING,
      defaultValue: 'rna'
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
    expression_class: {
      type: Sq.STRING,
      defaultValue: null,
    },
    
    tcgaPerc: {
      type: Sq.INTEGER,
    },
    tcgaPercCol: {
      type: Sq.STRING,
      defaultValue: null
    },
    tcgakIQR: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    tcgaQC: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    tcgaAvgPerc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    tcgaAvgkIQR: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    tcgaAvgQC: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    
    
    tcgaNormPerc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    kIQRNormal: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    
    ptxPerc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    ptxkIQR: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    ptxPercCol: {
      type: Sq.STRING,
      defaultValue: null,
    },
    ptxTotSampObs: {
      type: Sq.INTEGER,
      defaultValue: null,
    },
    ptxPogPerc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    
    
    gtexComp: {
      type: Sq.STRING,
      defaultValue: null,
    },
    gtexPerc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    gtexFC: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    gtexkIQR: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    gtexAvgPerc: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    gtexAvgFC: {
      type: Sq.FLOAT,
      defaultValue: null,
    },
    gtexAvgkIQR: {
      type: Sq.FLOAT,
      defaultValue: null,
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
};

