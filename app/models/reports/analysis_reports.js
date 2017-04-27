"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('analysis_report', {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    ident: {
      type: Sq.STRING,
      unique: true,
      allowNull: false
    },
    pog_id: {
      type: Sq.INTEGER,
      references: {
        model: 'POGs',
        key: 'id',
      }
    },
    createdBy_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    sampleInfo: {
      type: Sq.JSONB,
    },
    seqQC: {
      type: Sq.JSONB,
    },
    config: {
      type: Sq.TEXT
    }
  },
  {
    tableName: 'pog_analysis_reports',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'pog_id', 'createdBy_id', 'deletedAt']
        },
      }
    }
  });
};

