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
      },
      exported: {
        type: Sq.BOOLEAN,
        defaultValue: false
      }
    },
    {
      tableName: 'pog_analysis_germline_small_mutations',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          order:  [['createdAt', 'desc']],
          attributes: {
            exclude: ['deletedAt', 'id', 'pog_analysis_id', 'biofx_assigned_id']
          },
          include: [
            { as: 'analysis', model: sequelize.models.pog_analysis.scope('public') },
            { as: 'biofx_assigned', model: sequelize.models.user.scope('public') },
            { as: 'variants', model: sequelize.models.germline_small_mutation_variant, separate: true, order: [['gene', 'asc']] },
            { as: 'reviews', model: sequelize.models.germline_small_mutation_review, separate: true, include: [ {model: sequelize.models.user.scope('public'), as: 'reviewedBy'} ] }
          ]
        }
      }
    });
};

