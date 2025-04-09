const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');
const {DEFAULT_COLUMNS} = require('../../app/models/base');

const TABLE = 'reports_msi';

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
        score: {
          type: Sq.FLOAT,
          allowNull: false,
        },
        kbCategory: {
          name: 'kbCategory',
          field: 'kb_category',
          type: Sq.TEXT,
        },
      }, {transaction});

      return addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TABLE, ['ident']);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
