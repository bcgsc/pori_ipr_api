const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const variantText = sequelize.define(
    'variantText',
    {
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
    },
    {
      ...DEFAULT_OPTIONS,
      indexes: [
        {
          name: 'variant_text_unique_index',
          unique: true,
          fields: ['variant_name', 'cancer_type', 'template_id', 'project_id'],
          where: {
            deleted_at: {
              [Sq.Op.eq]: null,
            },
          },
        },
      ],
      tableName: 'variant_texts',
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedBy', 'projectId', 'templateId'],
          },
          include: [
            {model: sequelize.models.template.scope('minimal'), as: 'template'},
            {model: sequelize.models.project.scope('minimal'), as: 'project'},
          ],
        },
        extended: {
          include: [
            {model: sequelize.models.template, as: 'template'},
            {model: sequelize.models.project, as: 'project'},
          ],
        },
      },
    },
  );

  // set instance methods
  variantText.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, updatedBy, projectId, templateId, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return variantText;
};
