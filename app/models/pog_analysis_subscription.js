"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('analysis_subscription', {
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
      analysis_id: {
        type: Sq.INTEGER,
        references: {
          model: 'pog_analysis',
          keys: 'id'
        }
      },
      user_id: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          keys: 'id'
        }
      }
    },
    {
      tableName: 'pog_analysis_subscription',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          attributes: {
            exclude: ['deletedAt', 'id', 'analysis_id', 'user_id']
          },
        }
      }
    });
};

