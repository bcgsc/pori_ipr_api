const PROJECTS_TABLE = 'projects';
const VARIANT_TEXTS_TABLE = 'variant_texts';
const PROJECT_VARIANT_TEXT_JOIN = 'project_variant_text_join';
const {DEFAULT_MAPPING_COLUMNS} = require('../../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Create new Project Variant Text Join table
      await queryInterface.createTable(PROJECT_VARIANT_TEXT_JOIN, {
        ...DEFAULT_MAPPING_COLUMNS,
        projectId: {
          name: 'projectId',
          field: 'project_id',
          type: Sq.INTEGER,
          unique: false,
          allowNull: false,
          references: {
            model: PROJECTS_TABLE,
            key: 'id',
          },
        },
        variantTextId: {
          name: 'variantTextId',
          field: 'variant_text_id',
          type: Sq.INTEGER,
          unique: false,
          allowNull: false,
          references: {
            model: VARIANT_TEXTS_TABLE,
            key: 'id',
          },
        },
      }, {transaction});

      await queryInterface.addIndex(PROJECT_VARIANT_TEXT_JOIN, ['project_id'], {
        name: 'idx_project_variant_text_join_project_id',
        transaction,
      });
      await queryInterface.addIndex(PROJECT_VARIANT_TEXT_JOIN, ['variant_text_id'], {
        name: 'idx_project_variant_text_join_variant_text_id',
        transaction,
      });
      await queryInterface.addIndex(PROJECT_VARIANT_TEXT_JOIN, ['project_id', 'variant_text_id'], {
        name: 'idx_project_variant_text_join_project_variant_text',
        unique: true,
        where: {deleted_at: {[Sq.Op.eq]: null}},
        transaction,
      });

      // Migrate data from variant texts to join table
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into project_variant_text_join
        (project_id, variant_text_id, created_at, updated_at)
        select project_id, id, now(), now()
        from variant_texts
        where project_id is not null
        and deleted_at is null;`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction,
        },
      );

      // Remove projects fk column from variant_texts
      await queryInterface.removeColumn(VARIANT_TEXTS_TABLE, 'project_id', {transaction});

      // Preserve variant text uniqueness after removing the project foreign key
      await queryInterface.sequelize.query(`
        create unique index if not exists variant_text_unique_index
        on variant_texts ((array[
          variant_name,
          string_array_to_string(cancer_type, '', ''),
          template_id::text
        ]))
        where deleted_at is null;`, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
