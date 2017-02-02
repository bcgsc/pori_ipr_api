"use strict";

module.exports = (sequelize, Sq) => {
  let genomicAlterationsIdentified = sequelize.define('genomicAlterationsIdentified', {
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
      geneVariant: {
        type: Sq.INTEGER,
        allowNull: false,
      },
    }, {
      // Table Name
      tableName: 'summary.genomicAlterationsIdentified',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return genomicAlterationsIdentified;
};

