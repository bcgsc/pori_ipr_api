const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');

const TEMPLATE_APPENDIX_TABLE = 'templates_appendix';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove all deleted user entries and create new user_metadata table
      await queryInterface.createTable(TEMPLATE_APPENDIX_TABLE, {
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
        text: {
          type: Sq.TEXT,
        },
        templateId: {
          name: 'templateId',
          field: 'template_id',
          type: Sq.INTEGER,
          allowNull: false,
          references: {
            model: 'templates',
            key: 'id',
          },
          onDelete: 'CASCADE',
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
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TEMPLATE_APPENDIX_TABLE, ['ident']);

      // Enforce only a single appendix per template
      return addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TEMPLATE_APPENDIX_TABLE, ['template_id']);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
