const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');

const GERMLINE_REPORT_USER_TABLE = 'germline_report_users';

module.exports = {
  up: (queryInterface, Sq) => {
    // Create table
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove all deleted user entries and create new user_metadata table
      await queryInterface.createTable(GERMLINE_REPORT_USER_TABLE, {
        id: {
          type: Sq.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        ident: {
          type: Sq.UUID,
          unique: false,
          defaultValue: Sq.UUIDV4,
          allowNull: false,
        },
        role: {
          type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'reviewer', 'admin'),
          allowNull: false,
        },
        germlineReportId: {
          name: 'germlineReportId',
          field: 'germline_report_id',
          type: Sq.INTEGER,
          allowNull: false,
          references: {
            model: 'germline_small_mutations',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: Sq.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        addedById: {
          name: 'addedById',
          field: 'added_by_id',
          type: Sq.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        createdAt: {
          type: Sq.DATE,
          defaultValue: Sq.NOW,
          name: 'createdAt',
          field: 'created_at',
        },
        updatedAt: {
          type: Sq.DATE,
          name: 'updatedAt',
          field: 'updated_at',
        },
        deletedAt: {
          type: Sq.DATE,
          name: 'deletedAt',
          field: 'deleted_at',
        },
        updatedBy: {
          name: 'updatedBy',
          field: 'updated_by',
          type: Sq.INTEGER,
          references: {
            model: 'users',
            key: 'id',
          },
        },
      }, {transaction});

      // Add unique ident index
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, GERMLINE_REPORT_USER_TABLE, ['ident']);

      // Add not unique germline report id index
      return queryInterface.addIndex(GERMLINE_REPORT_USER_TABLE, {
        name: `${GERMLINE_REPORT_USER_TABLE}_germline_report_id_index`,
        fields: ['germline_report_id'],
        unique: false,
        where: {
          deleted_at: {[Sq.Op.eq]: null},
        },
        transaction,
      });
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
