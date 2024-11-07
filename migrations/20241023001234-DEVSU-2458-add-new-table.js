const TABLE = 'reports_signature_variants';
const {DEFAULT_COLUMNS} = require('../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create new notifications tables
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
        signatureName: {
          name: 'signatureName',
          field: 'signature_name',
          type: Sq.TEXT,
        },
        variantTypeName: {
          name: 'variantTypeName',
          field: 'variant_type_name',
          type: Sq.TEXT,
        },
        displayName: {
          name: 'displayName',
          field: 'display_name',
          type: Sq.TEXT,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
