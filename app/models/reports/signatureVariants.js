const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const signatureVariants = sequelize.define('signatureVariants', {
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
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_signature_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'gene1Id', 'gene2Id', 'deletedAt', 'updatedBy']},
        include: [
          {
            model: sequelize.models.genes.scope('minimal'),
            foreignKey: 'gene1Id',
            as: 'gene1',
          },
          {
            model: sequelize.models.genes.scope('minimal'),
            foreignKey: 'gene2Id',
            as: 'gene2',
          },
        ],
      },
    },
  });

  // set instance methods
  structuralVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, gene1Id, gene2Id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return structuralVariants;
};
