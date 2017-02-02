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
      comments: {
        type: Sq.TEXT,
        allowNull: true,
      },
      reviewedBy: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      reviewedAt: {
        type: Sq.DATE,
        allowNull: true,
      },
    }, 
    {
      // Table Name
      tableName: 'summary.analystComments',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return analystComments;
};

