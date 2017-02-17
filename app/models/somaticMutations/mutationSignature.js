"use strict";

module.exports = (sequelize, Sq) => {
  let mutationSignature = sequelize.define('mutationSignature', {
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
    signature: {
      type: Sq.INTEGER,
    },
    pearson: {
      type: Sq.FLOAT,
    },
    nnls: {
      type: Sq.FLOAT,
    },
    associations: {
      type: Sq.STRING,
    },
    features: {
      type: Sq.STRING,
    },
    numCancerTypes: {
      type: Sq.INTEGER,
    },
    cancerTypes: {
      type: Sq.STRING,
    },
  }, {
    // Table Name
    tableName: 'somaticMutations.mutationSignature',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true
  });

  return mutationSignature;
};

