"use strict";

module.exports = (sequelize, Sq) => {
  let analystComments = sequelize.define('analystComments', {
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
      pog_report_id: {
        type: Sq.INTEGER,
        references: {
          model: 'pog_analysis_reports',
          key: 'id',
        }
      },
      comments: {
        type: Sq.TEXT,
        allowNull: true,
      },
      reviewerSignedBy_id: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      reviewerSignedAt: {
        type: Sq.DATE,
        allowNull: true,
      },
      authorSignedBy_id: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      authorSignedAt: {
        type: Sq.DATE,
        allowNull: true,
      },
    }, 
    {
      // Table Name
      tableName: 'pog_analysis_reports_summary_analyst_comments',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'pog_id', 'pog_report_id', 'deletedAt', 'authorSignedBy_id', 'reviewerSignedBy_id']
          },
          include: [
            {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
            {model: sequelize.models.user.scope('public'), as: 'authorSignature'}
          ]
        }
      }
    });
    
  return analystComments;
};

