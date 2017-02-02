"use strict";

module.exports = (sequelize, Sq) => {
  let imageData = sequelize.define('imageData', {
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
      pog_id: {
        type: Sq.INTEGER,
        references: {
          model: 'POGs',
          key: 'id',
        }
      },
      filename: {
        type: Sq.STRING,
        allowNull: false,
      },
      key: {
        type: Sq.STRING,
        allowNull: false,
      },
      data: {
        type: Sq.TEXT,
        allowNull: false,
      }
    }, 
    {
      // Table Name
      tableName: 'imageData',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true
    });
    
  return imageData;
};

