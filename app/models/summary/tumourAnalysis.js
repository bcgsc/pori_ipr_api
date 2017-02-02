"use strict";

module.exports = (sequelize, Sq) => {
  let tumourAnalysis = sequelize.define('tumourAnalysis', {
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
      tumourContent: {
        type: Sq.INTEGER,
        allowNull: false,
      },
      ploidy: {
        type: Sq.STRING,
        allowNull: false,
      },
      normalExpressionComparator: {
        type: Sq.STRING,
      },
      diseaseExpressionComparator: {
        type: Sq.STRING,
      },
      subtyping: {
        type: Sq.STRING,
        allowNull: true,
        defaultValue: null,
      },
      tcgaColor: {
        type: Sq.STRING,
      },
    }, {
      // Table Name
      tableName: 'summary.tumourAnalysis',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return tumourAnalysis;
};

