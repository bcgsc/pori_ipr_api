const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');
const {DEFAULT_COLUMNS} = require('../../app/models/base');

const TABLE = 'reports_immune_cell_types';

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
          allowNull: false,
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        cellType: {
          name: 'cellType',
          field: 'cell_type',
          type: Sq.TEXT,
          allowNull: false,
        },
        kbCategory: {
          name: 'kbCategory',
          field: 'kb_category',
          type: Sq.TEXT,
        },
        score: {
          type: Sq.FLOAT,
        },
        percentile: {
          type: Sq.FLOAT,
        },
      }, {transaction});

      return addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TABLE, ['ident']);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
