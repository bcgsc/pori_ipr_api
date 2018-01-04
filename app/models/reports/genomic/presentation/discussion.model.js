"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('presentation_discussion',
    {
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
      pog_report_id: {
        type: Sq.INTEGER,
        references: {
          model: 'pog_analysis_reports',
          key: 'id',
        }
      },
      user_id: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      body: {
        type: Sq.TEXT,
        allowNull: true
      }
    },
    {
      // Table Name
      tableName: 'pog_analysis_reports_presentation_discussion',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'deletedAt']
          },
          include: [
            {model: sequelize.models.user.scope('public'), as: 'user'}
          ]
        }
      }
    });
  
};

