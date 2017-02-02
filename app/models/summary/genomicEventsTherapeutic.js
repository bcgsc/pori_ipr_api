"use strict";

module.exports = (sequelize, Sq) => {
  let genomicEventsTherapeutic = sequelize.define('genomicEventsTherapeutic', {
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
        defaultValue: 0
      },
      pog_id: {
        type: Sq.INTEGER,
        references: {
          model: 'POGs',
          key: 'id',
        }
      },
      genomicEvent: {
        type: Sq.STRING,
        allowNull: false
      },
      approvedThisCancerType: {
        type: Sq.STRING,
        allowNull: true
      },
      approvedOtherCancerType: {
        type: Sq.STRING,
        allowNull: true
      },
      emergingPreclinicalEvidence: {
        type: Sq.STRING,
        allowNull: true
      },
      comments: {
        type: Sq.TEXT,
        allowNull: true
      }
    }, {
      // Table Name
      tableName: 'summary.genomicEventsTherapeutic',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return genomicEventsTherapeutic;
};

