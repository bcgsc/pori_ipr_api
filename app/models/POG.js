"use strict";

module.exports = (sequelize, Sq) => {
  let POG = sequelize.define('POG', {
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
      sampleInfo: {
        type: Sq.JSONB,
      },
      seqQC: {
        type: Sq.JSONB,
      },
      config: {
        type: Sq.TEXT
      }
    }, {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return POG;
};

