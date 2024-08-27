const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');
const {USER_GROUPS} = require('../../constants');

module.exports = (sequelize, Sq) => {
  const userGroup = sequelize.define('userGroup', {
    ...DEFAULT_COLUMNS,
    userId: {
      name: 'userId',
      field: 'user_id',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    name: {
      type: Sq.ENUM(USER_GROUPS),
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'user_groups',
    scopes: {
      public: {
        order: [['user_id', 'ASC']],
        attributes: {
          exclude: ['id', 'deletedAt', 'updatedBy'],
        },
        include: [
          {as: 'users', model: sequelize.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}},
        ],
      },
    },
  });

  // set instance methods
  userGroup.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return userGroup;
};
