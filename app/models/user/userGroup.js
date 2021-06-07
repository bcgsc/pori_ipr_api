const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const userGroup = sequelize.define('userGroup', {
    ...DEFAULT_COLUMNS,
    name: {
      type: Sq.STRING,
      allowNull: false,
    },
    owner_id: {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'user_groups',
    scopes: {
      public: {
        order: [['name', 'ASC']],
        attributes: {
          exclude: ['id', 'owner_id', 'deletedAt'],
        },
        include: [
          {as: 'users', model: sequelize.models.user, attributes: {exclude: ['id', 'deletedAt', 'password']}, through: {attributes: []}},
          {as: 'owner', model: sequelize.models.user.scope('public')},
        ],
      },
    },
  });

  // set instance methods
  userGroup.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, owner_id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return userGroup;
};
