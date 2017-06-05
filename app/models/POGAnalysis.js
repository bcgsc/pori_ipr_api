"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('pog_analysis', {
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
    pog_id: {
      type: Sq.INTEGER,
      references: {
        model: 'POGs',
        key: 'id',
      }
    },
    libraries: {
      type: Sq.JSONB,
      defaultValue: { tumour: null, normal: null, transcriptome: null }
    },
    biopsyDate: {
      type: Sq.DATE
    },
    name: {
      type: Sq.STRING,
      allowNull: true
    },
    bioapps_source_id: {
      type: Sq.INTEGER,
      defaultValue: null
    }
  },
  {
    tableName: 'pog_analysis',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'pog_id', 'deletedAt']
        },
        include: [
          { as: 'pog', model: sequelize.models.POG.scope('public') }
        ]
      }
    }
  });
};

