const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('germline_small_mutation_review', {
    ...DEFAULT_COLUMNS,
    germline_report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'germline_small_mutations',
        key: 'id',
      },
    },
    reviewedBy_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: Sq.TEXT,
      allowNull: false,
    },
    comment: {
      type: Sq.TEXT,
      allowNull: true,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations_review',
    scopes: {
      public: {
        order: [['createdAt', 'ASC']],
        attributes: {
          exclude: ['id', 'germline_report_id', 'reviewedBy_id', 'deletedAt'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewedBy'},
        ],
      },
    },
  });
};
