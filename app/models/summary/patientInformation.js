"use strict";

module.exports = (sequelize, Sq) => {
  let patientInformation = sequelize.define('patientInformation', {
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
      physician: {
        type: Sq.STRING,
        allowNull: false,
      },
      gender: {
        type: Sq.STRING,
        allowNull: true,
      },
      age: {
        type: Sq.STRING,
      },
      POGID: {
        type: Sq.STRING,
      },
      tumourType: {
        type: Sq.STRING,
      },
      reportDate: {
        type: Sq.STRING,
      },
      biopsySite: {
        type: Sq.STRING,
      },
      tumourSample: {
        type: Sq.STRING,
      },
      tumourProtocol: {
        type: Sq.STRING,
      },
      constitutionalSample: {
        type: Sq.STRING
      },
      constitutionalProtocol: {
        type: Sq.STRING
      }
    }, {
      // Table Name
      tableName: 'summary.patientInformation',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return patientInformation;
};

