const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('userGroup', {
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
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'user_groups',
    scopes: {
      public: {
        order: [['ordinal', 'ASC']],
        attributes: {
          exclude: ['id', 'owner_id', 'deletedAt'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'owner'},
        ],
      },
    },
  });
};
