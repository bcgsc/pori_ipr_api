"use strict";

module.exports = (sequelize, Sq) => {
  let mutationSummary = sequelize.define('mutationSummary', {
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
      mutationSignature: {
        type: Sq.STRING,
        allowNull: true,
        defaultValue: null,
      },
      totalSNV: {
        type: Sq.STRING,
      },
      totalIndel: {
        type: Sq.STRING,
      },
      totalSV: {
        type: Sq.STRING
      },
      snvPercentileTCGA: {
        type: Sq.INTEGER
      },
      snvPercentileDisease: {
        type: Sq.STRING
      },
      indelPercentileTCGA: {
        type: Sq.INTEGER
      },
      indelPercentileDisease: {
        type: Sq.STRING
      },
      svPercentilePOG: {
        type: Sq.INTEGER
      },
      snvPercentileTCGACategory: {
        type: Sq.STRING
      },
      snvPercentileDiseaseCategory: {
        type: Sq.STRING
      },
      indelPercentileTCGACategory: {
        type: Sq.STRING
      },
      indelPercentileDiseaseCategory: {
        type: Sq.STRING
      },
      svPercentilePOGCategory: {
        type: Sq.STRING
      },
      snvReportCategory: {
        type: Sq.STRING
      },
      indelReportCategory: {
        type: Sq.STRING
      }
    }, {
      // Table Name
      tableName: 'summary.mutationSummary',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return mutationSummary;
};

