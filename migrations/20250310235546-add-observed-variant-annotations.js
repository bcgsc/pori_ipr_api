'use strict';

const TABLE = 'reports_observed_variant_annotations';
const {DEFAULT_COLUMNS, DEFAULT_MAPPING_COLUMNS} = require('../app/models/base');
const {KB_PIVOT_COLUMN, KB_PIVOT_MAPPING} = require('../app/constants');

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
        comment: {
          type: Sq.TEXT,
          allowNull: true,
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

      // Migrate comments from MUT
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into reports_observed_variant_annotations
        (ident, created_at, updated_at, report_id, comment, variant_id, variant_type)
        select gen_random_uuid(), created_at, updated_at, report_id, comment, id,
        'mut'
        from reports_small_mutations
        where comment is not null and deleted_at is null;`,
        {
          transaction,
        },
      );
      // EXP
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into reports_observed_variant_annotations
        (ident, created_at, updated_at, report_id, comment, variant_id, variant_type)
        select gen_random_uuid(), created_at, updated_at, report_id, comment, id,
        'exp'
        from reports_expression_variants
        where comment is not null and deleted_at is null;`,
        {
          transaction,
        },
      );
      // SV
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into reports_observed_variant_annotations
        (ident, created_at, updated_at, report_id, comment, variant_id, variant_type)
        select gen_random_uuid(), created_at, updated_at, report_id, comment, id,
        'sv'
        from reports_structural_variants
        where comment is not null and deleted_at is null;`,
        {
          transaction,
        },
      );
      // CNV
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into reports_observed_variant_annotations
        (ident, created_at, updated_at, report_id, comment, variant_id, variant_type)
        select gen_random_uuid(), created_at, updated_at, report_id, comment, id,
        'cnv'
        from reports_copy_variants
        where comment is not null and deleted_at is null;`,
        {
          transaction,
        },
      );
      // TMB
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into reports_observed_variant_annotations
        (ident, created_at, updated_at, report_id, comment, variant_id, variant_type)
        select gen_random_uuid(), created_at, updated_at, report_id, comment, id,
        'tmb'
        from reports_tmbur_mutation_burden
        where comment is not null and deleted_at is null;`,
        {
          transaction,
        },
      );
      // MSI
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into reports_observed_variant_annotations
        (ident, created_at, updated_at, report_id, comment, variant_id, variant_type)
        select gen_random_uuid(), created_at, updated_at, report_id, comment, id,
        'msi'
        from reports_msi
        where comment is not null and deleted_at is null;`,
        {
          transaction,
        },
      );
    });
  },


  down: () => {
    throw new Error('Not Implemented!');
  },
};
