const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const templateAppendix = sequelize.define('templateAppendix', {
    ...DEFAULT_COLUMNS,
    templateId: {
      name: 'templateId',
      field: 'template_id',
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'templates',
        key: 'id',
      },
    },
    projectId: {
      name: 'projectId',
      field: 'project_id',
      type: Sq.INTEGER,
      unique: false,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    text: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'templates_appendix',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'templateId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  templateAppendix.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, projectId, templateId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return templateAppendix;
};
