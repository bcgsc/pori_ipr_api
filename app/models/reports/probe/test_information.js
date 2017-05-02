"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('probe_test_information', {
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
      pog_id: {
        type: Sq.INTEGER,
        references: {
          model: 'POGs',
          key: 'id',
        }
      },
      pog_report_id: {
        type: Sq.INTEGER,
        references: {
          model: 'pog_analysis_reports',
          key: 'id',
        }
      },
      kbVersion: {
        type: Sq.STRING,
        allowNull: false
      },
      snpProbe: {
        type: Sq.STRING,
        allowNull: false
      },
      snpGenes: {
        type: Sq.STRING,
        allowNull: false
      },
      snpVars: {
        type: Sq.STRING,
        allowNull: false
      },
      fusionProbe: {
        type: Sq.STRING,
        allowNull: false
      },
      fusionGenes: {
        type: Sq.STRING,
        allowNull: false
      },
      fusionVars: {
        type: Sq.STRING,
        allowNull: false
      }
    },
    {
      // Table Name
      tableName: 'pog_analysis_reports_probe_test_information',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      paranoid: true,
      scopes: {
        public: {
          attributes: { exclude: ['id', 'pog_report_id', 'pog_id', 'deletedAt'] }
        }
      }
    });
};

