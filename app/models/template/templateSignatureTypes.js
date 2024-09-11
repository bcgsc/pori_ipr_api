const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const templateSignatureTypes = sequelize.define(
    'templateSignatureTypes',
    {
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
      signatureType: {
        name: 'signatureType',
        field: 'signature_type',
        type: Sq.TEXT,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          name: 'template',
          fields: ['templateId'],
          unique: true,
          where: {
            projectId: null,
            deletedAt: null,
          },
        },
      ],
      ...DEFAULT_OPTIONS,
      tableName: 'templates_signature_types',
      scopes: {
        public: {
          attributes: {exclude: ['id', 'templateId', 'deletedAt', 'updatedBy']},
        },
      },
    },
  );

  // set instance methods
  templateSignatureTypes.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, templateId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return templateSignatureTypes;
};
