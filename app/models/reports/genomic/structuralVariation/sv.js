"use strict";

module.exports = (sequelize, Sq) => {
  let sv = sequelize.define('sv', {
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
    mavis_product_id: {
      type: Sq.STRING
    },
    svVariant: {
      type: Sq.ENUM('clinical', 'nostic', 'biological', 'fusionOmicSupport')
    },
    genes: {
      type: Sq.STRING,
    },
    exons: {
      type: Sq.STRING,
    },
    breakpoint: {
      type: Sq.STRING,
    },
    eventType: {
      type: Sq.STRING,
    },
    detectedIn: {
      type: Sq.STRING,
    },
    conventionalName: {
      type: Sq.STRING,
    },
    rpkm: {
      type: Sq.STRING,
    },
    foldChange: {
      type: Sq.STRING,
    },
    tcgaPerc: {
      type: Sq.STRING,
    },
    svg: {
      type: Sq.TEXT,
      allowNull: true,
      defaultValue: null
    },
    svgTitle: {
      type: Sq.TEXT,
      allowNull: true,
      defaultValue: null
    },
    name: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    },
    frame: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    },
    ctermGene: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    },
    ntermGene: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    },
    ctermTranscript: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    },
    ntermTranscript: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null
    }
  }, {
    // Table Name
    tableName: 'pog_analysis_reports_structural_variation_sv',
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

  return sv;
};

