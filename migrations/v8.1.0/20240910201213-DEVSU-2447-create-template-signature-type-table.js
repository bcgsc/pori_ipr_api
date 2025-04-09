const TABLE = 'templates_signature_types';
const {DEFAULT_COLUMNS} = require('../../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create new notifications tables
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(TABLE, {
        ...DEFAULT_COLUMNS,
        templateId: {
          name: 'templateId',
          field: 'template_id',
          type: Sq.INTEGER,
          references: {
            model: 'templates',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: false,
        },
        signatureType: {
          name: 'signatureType',
          field: 'signature_type',
          type: Sq.STRING,
          allowNull: false,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
