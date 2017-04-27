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
        type: Sq.ENUM('bcgsc', 'local'),
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
      jiraToken: {
        type: Sq.STRING,
        allowNull: true,
        defaultValue: null
      },
      jiraXsrf: {
        type: Sq.STRING,
        allowNull: true,
        defaultValue: null
      },
      access: {
        type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'administration', 'superUser'),
        allowNull: false,
      },
      settings: {
        type: Sq.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      lastLogin: {
        type: Sq.DATE,
        defaultValue: null,
        allowNull: true
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
            exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf', 'settings', 'access']
          },
        }
      }
    });

  return user;
};

