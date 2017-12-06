"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('germline_small_mutation', {
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
      pog_analysis_id: {
        type: Sq.INTEGER,
        required: true,
        references: {
          model: 'pog_analysis',
          key: 'id',
        }
      },
      source_version: {
        type: Sq.STRING,
        allowNull: false,
      },
      source_path: {
        type: Sq.STRING,
        allowNull: false,
      },
      biofx_assigned_id: {
        type: Sq.INTEGER,
        required: true,
        references: {
          model: 'users',
          key: 'id',
        }
      }
    },
    {
      indexes: [
        {
          unique: true,
          fields: ['pog_analysis_id', 'source_version']
        }
      ],
      tableName: 'pog_analysis_germline_small_mutations',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          order:  [['ordinal', 'ASC']],
          attributes: {
            exclude: ['deletedAt', 'id', 'analysis_id']
          },
          include: [
            { as: 'analysis', model: sequelize.models.pog_analysis.scope('public') }
          ]
        }
      }
    });
};

