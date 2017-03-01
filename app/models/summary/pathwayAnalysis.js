"use strict";

module.exports = (sequelize, Sq) => {
  let pathwayAnalysis = sequelize.define('pathwayAnalysis', {
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
      original: {
        type: Sq.TEXT,
        allowNull: true,
      },
      pathway: {
        type: Sq.TEXT,
        allowNull: true,
      },
    },
    {
      // Table Name
      tableName: 'summary.pathwayAnalysis',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });

  return pathwayAnalysis;
};

