"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('germline_small_mutation_review', {
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
      germline_report_id: {
        type: Sq.INTEGER,
        required: true,
        references: {
          model: 'pog_analysis_germline_small_mutations',
          key: 'id',
        }
      },
      reviewedBy_id: {
        type: Sq.INTEGER,
        required: true,
        references: {
          model: 'pog_analysis',
          key: 'id',
        }
      },
      type: {
        type: Sq.STRING,
        allowNull: false
      },
      comment: {
        type: Sq.TEXT,
        allowNull: true
      }
    },
    {
      tableName: 'pog_analysis_germline_small_mutations_review',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          order:  [['createdAt', 'ASC']],
          attributes: {
            exclude: ['deletedAt', 'id', 'germline_report_id', 'reviewedBy_id']
          },
          include: [
            {model: sequelize.models.user.scope('public'), as: 'reviewedBy'}
          ]
        }
      }
    });
};

