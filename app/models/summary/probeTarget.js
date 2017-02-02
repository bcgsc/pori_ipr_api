"use strict";

module.exports = (sequelize, Sq) => {
  let probeTarget = sequelize.define('probeTarget', {
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
        allowNull: false,
      },
      variant: {
        type: Sq.STRING,
        allowNull: false,
      },
      sample: {
        type: Sq.STRING,
        allowNull: false,
      }
    }, {
      // Table Name
      tableName: 'summary.probeTarget',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return probeTarget;
};

