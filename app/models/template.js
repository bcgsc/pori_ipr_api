const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = (sequelize) => {
  const template = sequelize.define('template', {
    ...DEFAULT_COLUMNS,
    name: {
      type: Sq.STRING,
      allowNull: false,
    },
    organization: {
      type: Sq.TEXT,
    },
    sections: {
      type: Sq.JSONB,
      allowNull: false,
      jsonSchema: {
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            'summary', 'analyst-comments', 'pathway-analysis', 'therapeutic-targets',
            'kb-matches', 'slides', 'discussion', 'microbial', 'expression-correlation',
            'mutation-signatures', 'mutation-burden', 'immune', 'small-mutations',
            'copy-number', 'structural-variants', 'expression', 'appendices',
          ],
          description: 'list of sections to display on the client',
        },
      },
    },
    logoId: {
      name: 'logoId',
      field: 'logo_id',
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'images',
        key: 'id',
      },
    },
    headerId: {
      name: 'headerId',
      field: 'header_id',
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'images',
        key: 'id',
      },
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'templates',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt', 'logoId', 'headerId'],
        },
        include: [
          {as: 'logoImage', model: sequelize.models.image.scope('public')},
          {as: 'headerImage', model: sequelize.models.image.scope('public')},
        ],
      },
    },
  });

  // set instance methods
  template.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, logoId, headerId, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return template;
};
