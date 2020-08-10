const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const user = sequelize.define('user', {
    ...DEFAULT_COLUMNS,
    username: {
      type: Sq.STRING,
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
      defaultValue: null,
    },
    jiraXsrf: {
      type: Sq.STRING,
      defaultValue: null,
    },
    settings: {
      type: Sq.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    lastLogin: {
      type: Sq.DATE,
      defaultValue: null,
    },
  }, {
    ...DEFAULT_OPTIONS,
    indexes: [
      ...DEFAULT_OPTIONS.indexes || [],
      {
        unique: true,
        fields: ['username'],
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      },
    ],
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt', 'password', 'jiraToken', 'jiraXsrf', 'settings'],
        },
      },
    },
  });

  // set instance methods
  user.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, deletedAt, password, jiraToken, jiraXsrf, settings, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return user;
};
