const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'userGroupMember',
    {
      ...DEFAULT_MAPPING_COLUMNS,
      user_id: {
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      group_id: {
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        references: {
          model: 'user_groups',
          key: 'id',
        },
      },
    },
    {
      ...DEFAULT_MAPPING_OPTIONS,
      tableName: 'user_group_members',
    },
  );
};
