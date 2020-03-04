const Sq = require('sequelize');
const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('./base');

module.exports = (sequelize) => {
  return sequelize.define('flash_token', {
    ...DEFAULT_MAPPING_COLUMNS,
    token: {
      type: Sq.UUID,
      unique: true,
      defaultValue: Sq.UUIDV4,
    },
    user_id: {
      type: Sq.INTEGER,
      unique: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    resource: {
      type: Sq.STRING,
    },
  },
  {
    ...DEFAULT_MAPPING_OPTIONS,
    tableName: 'flash_tokens',
  });
};
