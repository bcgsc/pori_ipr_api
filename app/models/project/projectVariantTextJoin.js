const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'projectVariantTextJoin',
    {
      ...DEFAULT_MAPPING_COLUMNS,
      projectId: {
        name: 'projectId',
        field: 'project_id',
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        references: {
          model: 'projects',
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
          model: 'variant_texts',
          key: 'id',
        },
      },
    },
    {
      ...DEFAULT_MAPPING_OPTIONS,
      tableName: 'project_variant_text_join',
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'deletedAt'],
          },
        },
      },
      indexes: [
        {
          name: 'idx_project_id_join',
          fields: ['project_id'],
        },
        {
          name: 'idx_variant_text_id_join',
          fields: ['variant_text_id'],
        },
      ],
    },
  );
};
