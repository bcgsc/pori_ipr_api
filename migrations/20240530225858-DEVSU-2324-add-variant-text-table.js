const TABLE = 'variant_texts';
const {DEFAULT_COLUMNS} = require('../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create new variant texts table
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(TABLE, {
        ...DEFAULT_COLUMNS,
        projectId: {
          type: Sq.INTEGER,
          name: 'projectId',
          field: 'project_id',
          references: {
            model: 'projects',
            key: 'id',
          },
        },
        templateId: {
          type: Sq.INTEGER,
          name: 'templateId',
          field: 'template_id',
          references: {
            model: 'templates',
            key: 'id',
          },
        },
        text: {
          type: Sq.TEXT,
        },
        variantName: {
          name: 'variantName',
          field: 'variant_name',
          type: Sq.TEXT,
        },
        variantGkbId: {
          name: 'variantGkbId',
          field: 'variant_gkb_id',
          type: Sq.TEXT,
        },
        cancerType: {
          name: 'cancerType',
          field: 'cancer_type',
          type: Sq.TEXT,
        },
        cancerTypeGkbId: {
          name: 'cancerTypeGkbId',
          field: 'cancer_type_gkb_id',
          type: Sq.TEXT,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
