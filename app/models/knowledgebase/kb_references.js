"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('kb_reference', {
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
    createdBy_id: {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    reviewedBy_id: {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    events_expression: {
      type: Sq.TEXT,
      allowNull: true
    },
    type: {
      type: Sq.ENUM('therapeutic','prognostic','biological','occurrence','diagnostic', 'pharmacogenomic'),
      allowNull: true
    },
    relevance: {
      type: Sq.TEXT,
      allowNull: true
    },
    context: {
      type: Sq.TEXT,
      allowNull: true
    },
    disease_list: {
      type: Sq.TEXT,
      allowNull: true
    },
    evidence: {
      type: Sq.STRING,
      allowNull: true
    },
    id_type: {
      type: Sq.TEXT,
      allowNull: true
    },
    ref_id: {
      type: Sq.TEXT,
      allowNull: true
    },
    id_title: {
      type: Sq.TEXT,
      allowNull: true,
    },
    status: {
      type: Sq.STRING,
      allowNull: true
    },
    summary: {
      type: Sq.TEXT,
      allowNull: true
    },
    sample_type: {
      type: Sq.TEXT,
      allowNull: true
    },
    sample_size: {
      type: Sq.INTEGER,
      allowNull: true
    },
    preclinical_model: {
      type: Sq.TEXT,
      allowNull: true
    },
    comments: {
      type: Sq.TEXT,
      allowNull: true
    },
    approvedAt: {
      type: Sq.DATE
    }
  }, {
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Don't create updatedAt
    updatedAt: false,
    // Use soft-deletes!
    paranoid: true
  });
};

