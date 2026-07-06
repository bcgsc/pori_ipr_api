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
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
