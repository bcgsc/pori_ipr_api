"use strict";

module.exports = (sequelize, Sq) => {
  let user = sequelize.define('user', {
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
      username: {
        type: Sq.STRING,
        unique: true,
        allowNull: false
      },
      password: {
        type: Sq.STRING,
      },
      type: {
        type: Sq.ENUM('bcgsc','local'),
        defaultValue: 'local',
      },
      firstName: {
        type: Sq.STRING,
      },
      lastName: {
        type: Sq.STRING,
      },
      email: {
        type: Sq.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      access: {
        type: Sq.ENUM('public','bioinformatician','analyst','admin'),
        allowNull: false,
        defaultValue: 'public',
      }
    }, {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return user;
};

