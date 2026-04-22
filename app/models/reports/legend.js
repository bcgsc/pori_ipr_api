const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const legend = sequelize.define(
    'legend',
    {
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
      format: {
        type: Sq.ENUM('PNG', 'JPG'),
        defaultValue: 'PNG',
      },
      filename: {
        type: Sq.TEXT,
        allowNull: false,
      },
      version: {
        type: Sq.TEXT,
        allowNull: false,
      },
      data: {
        type: Sq.TEXT,
        allowNull: false,
      },
      title: {
        type: Sq.TEXT,
      },
      caption: {
        type: Sq.TEXT,
      },
      height: {
        type: Sq.INTEGER,
      },
      width: {
        type: Sq.INTEGER,
      },
    },
    {
      ...DEFAULT_REPORT_OPTIONS,
      tableName: 'pathway_analysis_legends',
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
          },
        },
        versionlist: {
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedBy', 'data'],
          },
        },
      },
    },
  );

  // set instance methods
  legend.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    if (scope === 'versionlist') {
      const {id, deletedAt, updatedBy, exclue, ...versionlistView} = this.dataValues;
      return versionlistView;
    }
    return this;
  };

  return legend;
};
