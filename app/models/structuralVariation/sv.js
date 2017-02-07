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
    tableName: 'structuralVariation.sv',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true
  });

  return sv;
};

