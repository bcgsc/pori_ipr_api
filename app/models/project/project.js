"use strict";

module.exports = (sequelize, Sq) => {
  let project = sequelize.define('project', {
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
      name: {
        type: Sq.STRING,
        unique: true,
        allowNull: false
      },
    },
    {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          attributes: {
            exclude: ['deletedAt', 'id']
          },
        }
      }
    });

  return project;
};

