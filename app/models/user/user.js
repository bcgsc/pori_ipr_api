const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = sequelize => sequelize.define('user', {
  ...DEFAULT_COLUMNS,
  username: {
    type: Sq.STRING,
    unique: true,
    allowNull: false,
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
      isEmail: true,
    },
  },
  jiraToken: {
    type: Sq.STRING,
    allowNull: true,
    defaultValue: null,
  },
  jiraXsrf: {
    type: Sq.STRING,
    allowNull: true,
    defaultValue: null,
  },
  access: {
    type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'administration', 'superUser'),
    allowNull: false,
  },
  settings: {
    type: Sq.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  lastLogin: {
    type: Sq.DATE,
    defaultValue: null,
    allowNull: true,
  },
},
{
  ...DEFAULT_OPTIONS,
  scopes: {
    public: {
      attributes: {
        exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf', 'settings', 'access'],
      },
    },
  },
});
