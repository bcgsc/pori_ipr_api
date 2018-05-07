"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('POG', {
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
    POGID: {
      type: Sq.STRING,
      unique: false
    },
    nonPOG: {
      type: Sq.BOOLEAN,
      defaultValue: false
    },
    project: {
      type: Sq.STRING,
      defaultValue: 'POG'
    },
    alternate_identifier: {
      type: Sq.STRING
    },
    age_of_consent: {
      type: Sq.INTEGER
    }
  },
  {
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt']
        },
      }
    }
  });
};

