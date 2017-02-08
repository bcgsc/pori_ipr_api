"use strict";

module.exports = (sequelize, Sq) => {
  let drugTarget = sequelize.define('drugTarget', {
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
    tableName: 'expression.drugTarget',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true
  });

  return drugTarget;
};

