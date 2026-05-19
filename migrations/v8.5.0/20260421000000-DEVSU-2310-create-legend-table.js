const TABLE = 'pathway_analysis_legends';
const {DEFAULT_COLUMNS} = require('../../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(TABLE, {
        ...DEFAULT_COLUMNS,
        reportId: {
          name: 'reportId',
          field: 'report_id',
          type: Sq.INTEGER,
          references: {
            model: 'reports',
            key: 'id',
          },
        },
        format: {
          type: Sq.ENUM('PNG', 'JPG'),
          defaultValue: 'PNG',
        },
        filename: {
          type: Sq.TEXT,
          allowNull: false,
        },
        version: {
          type: Sq.TEXT,
          allowNull: false,
        },
        data: {
          type: Sq.TEXT,
          allowNull: false,
        },
        title: {
          type: Sq.TEXT,
        },
        caption: {
          type: Sq.TEXT,
        },
        height: {
          type: Sq.INTEGER,
        },
        width: {
          type: Sq.INTEGER,
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
