const TABLE = 'pathway_analysis_legends';
const {DEFAULT_COLUMNS} = require('../../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(TABLE, {
        ...DEFAULT_COLUMNS,
        format: {
          type: Sq.ENUM('PNG', 'JPG'),
          defaultValue: 'PNG',
        },
        filename: {
          type: Sq.TEXT,
          allowNull: false,
        },
        name: {
          type: Sq.TEXT,
          allowNull: false,
        },
        data: {
          type: Sq.TEXT,
          allowNull: false,
        },
        default: {
          type: Sq.BOOLEAN,
          defaultValue: false,
        },
      }, {transaction});
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable(TABLE, {transaction});
    });
  },
};
