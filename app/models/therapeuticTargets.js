"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('therapeuticTarget', {
      id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ident: {
        type: Sq.UUID,
        unique: true,
        defaultValue: Sq.UUIDV4
      },
      dataVersion: {
        type: Sq.INTEGER,
        defaultValue: 0
      },
      pog_id: {
        type: Sq.INTEGER,
        references: {
          model: 'POGs',
          key: 'id',
        }
      },
      type: {
        type: Sq.ENUM('therapeutic','chemoresistance'),
        allowNull: false
      },
      rank: {
        type: Sq.INTEGER,
        defaultValue: 0
      },
      gene: {
        type: Sq.STRING,
        allowNull: true
      },
      geneContext: {
        type: Sq.STRING,
        allowNull: true
      },
      resistanceMarker: {
        type: Sq.STRING,
        allowNull: true
      },
      biomarker: {
        type: Sq.STRING,
        allowNull: true
      },
      biomarkerContext: {
        type: Sq.STRING,
        allowNull: true
      },
      notes: {
        type: Sq.TEXT
      }
    },
    {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes
      paranoid: true,
    });
};

