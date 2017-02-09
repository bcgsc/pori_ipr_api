"use strict";

module.exports = (sequelize, Sq) => {
  let variantCounts = sequelize.define('variantCounts', {
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
      smallMutations: {
        type: Sq.INTEGER,
        allowNull: false,
      },
      CNVs: {
        type: Sq.INTEGER,
        allowNull: false,
      },
      SVs: {
        type: Sq.INTEGER,
        allowNull: false,
      },
      expressionOutliers: {
        type: Sq.INTEGER,
        allowNull: false,
      },
      variantsUnknown: {
        type: Sq.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
    }, {
      // Table Name
      tableName: 'summary.variantCounts',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return variantCounts;
};

