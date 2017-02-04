"use strict";

module.exports = (sequelize, Sq) => {
  let targetedGenes = sequelize.define('targetedGenes', {
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
      type: Sq.STRING
    },
    variant: {
      type: Sq.STRING,
    },
    sample: {
      type: Sq.STRING,
    },
  }, {
    // Table Name
    tableName: 'detailedGenomicAnalysis.targetedGenes',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true
  });
  return targetedGenes;
};

