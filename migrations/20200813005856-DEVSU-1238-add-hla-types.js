/**
 * This is optitype output data
 * https://pubmed.ncbi.nlm.nih.gov/25143287
 */

const NEW_TABLE = 'reports_hla_types';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // create the new table
      await queryInterface.createTable(NEW_TABLE, {
        id: {
          type: Sq.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        createdAt: {
          type: Sq.DATE,
          defaultValue: Sq.NOW,
          name: 'createdAt',
          field: 'created_at',
        },
        deletedAt: {
          type: Sq.DATE,
          name: 'deletedAt',
          field: 'deleted_at',
        },
        updatedAt: {
          type: Sq.DATE,
          name: 'updatedAt',
          field: 'updated_at',
        },
        ident: {
          type: Sq.UUID,
          unique: false,
          defaultValue: Sq.UUIDV4,
          allowNull: false,
        },
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
        library: {
          type: Sq.TEXT,
          allowNull: false,
        },
        pathology: {
          type: Sq.ENUM(['diseased', 'normal']),
          allowNull: false,
        },
        protocol: {
          type: Sq.ENUM(['DNA', 'RNA']),
          allowNull: false,
        },
        a1: {
          type: Sq.TEXT,
        },
        a2: {
          type: Sq.TEXT,
        },
        b1: {
          type: Sq.TEXT,
        },
        b2: {
          type: Sq.TEXT,
        },
        c1: {
          type: Sq.TEXT,
        },
        c2: {
          type: Sq.TEXT,
        },
        reads: {
          type: Sq.FLOAT,
        },
        objective: {
          type: Sq.FLOAT,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
