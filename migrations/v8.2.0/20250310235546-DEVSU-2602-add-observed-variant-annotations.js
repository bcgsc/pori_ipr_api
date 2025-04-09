const TABLE = 'reports_observed_variant_annotations';
const {DEFAULT_COLUMNS} = require('../../app/models/base');
const {KB_PIVOT_COLUMN, KB_PIVOT_MAPPING} = require('../../app/constants');

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
        variantType: {
          name: KB_PIVOT_COLUMN,
          field: 'variant_type',
          type: Sq.ENUM(...Object.keys(KB_PIVOT_MAPPING)),
          allowNull: false,
        },
        variantId: {
          name: 'variantId',
          field: 'variant_id',
          type: Sq.INTEGER,
          allowNull: false,
        },
        annotations: {
          name: 'annotations',
          field: 'annotations',
          type: Sq.JSONB,
          jsonSchema: {
            schema: {
              type: 'object',
              example: {inferred: true},
            },
          },
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
