"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('recent_report', {
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
        key: 'id',
      }
    },
    state: {
      type: Sq.STRING,
      allowNull: false,
    }
  }, {
    // Table Name
    tableName: 'pog_recent_reports',
    // Automatically create createdAt, updatedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: false,
    scopes: {
      public: {
        attributes: {
          exclude: ['pog_report_id', 'user_id', 'id']
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'user'},
          {model: sequelize.models.analysis_report.scope('extended'), as: 'report'}
        ]
      }
    }
  });
};

