const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define('userProject', {
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
    project_id: {
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
  },
  {
    ...DEFAULT_MAPPING_OPTIONS,
    tableName: 'user_projects',
  });
};
