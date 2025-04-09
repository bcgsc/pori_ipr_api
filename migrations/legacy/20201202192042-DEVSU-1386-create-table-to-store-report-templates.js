const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');

const IMAGE_TABLE = 'images';
const TEMPLATE_TABLE = 'templates';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(IMAGE_TABLE, {
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
        type: {
          type: Sq.STRING,
          allowNull: false,
        },
        filename: {
          type: Sq.TEXT,
          allowNull: false,
        },
        data: {
          type: Sq.TEXT,
          allowNull: false,
        },
        format: {
          type: Sq.STRING,
          allowNull: false,
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
      }, {transaction});

      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, IMAGE_TABLE, ['ident']);

      await queryInterface.createTable(TEMPLATE_TABLE, {
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
        name: {
          type: Sq.STRING,
          allowNull: false,
        },
        organization: {
          type: Sq.TEXT,
        },
        sections: {
          type: Sq.JSONB,
          allowNull: false,
        },
        logoId: {
          name: 'logoId',
          field: 'logo_id',
          type: Sq.INTEGER,
          allowNull: true,
          references: {
            model: 'images',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        headerId: {
          name: 'headerId',
          field: 'header_id',
          type: Sq.INTEGER,
          allowNull: true,
          references: {
            model: 'images',
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
      }, {transaction});

      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TEMPLATE_TABLE, ['name']);

      return addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TEMPLATE_TABLE, ['ident']);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
