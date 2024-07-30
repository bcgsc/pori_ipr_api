const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const signatures = sequelize.define('signatures', {
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
    reviewerId: {
      name: 'reviewerId',
      field: 'reviewer_id',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    reviewerSignedAt: {
      name: 'reviewerSignedAt',
      field: 'reviewer_signed_at',
      type: Sq.DATE,
      allowNull: true,
    },
    authorId: {
      name: 'authorId',
      field: 'author_id',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    authorSignedAt: {
      name: 'authorSignedAt',
      field: 'author_signed_at',
      type: Sq.DATE,
      allowNull: true,
    },
    creatorId: {
      name: 'creatorId',
      field: 'creator_id',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    creatorSignedAt: {
      name: 'creatorSignedAt',
      field: 'creator_signed_at',
      type: Sq.DATE,
      allowNull: true,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_signatures',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'reviewerId', 'authorId', 'creatorId', 'updatedBy']},
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
          {model: sequelize.models.user.scope('public'), as: 'authorSignature'},
          {model: sequelize.models.user.scope('public'), as: 'creatorSignature'},
        ],
      },
      history: {
        attributes: {exclude: ['id', 'reportId', 'reviewerId', 'authorId', 'creatorId', 'updatedBy']},
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
          {model: sequelize.models.user.scope('public'), as: 'authorSignature'},
          {model: sequelize.models.user.scope('public'), as: 'creatorSignature'},
        ],
      },
    },
  });

  // set instance methods
  signatures.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, reviewerId, authorId, creatorId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return signatures;
};
