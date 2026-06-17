const {DEFAULT_COLUMNS} = require('../base');

module.exports = (sequelize, Sq) => {
  const legend = sequelize.define(
    'legend',
    {
      ...DEFAULT_COLUMNS,
      format: {
        type: Sq.ENUM('PNG', 'JPG'),
        defaultValue: 'PNG',
      },
      filename: {
        type: Sq.TEXT,
        allowNull: false,
      },
      name: {
        type: Sq.TEXT,
        allowNull: false,
      },
      data: {
        type: Sq.TEXT,
        allowNull: false,
      },
      default: {
        type: Sq.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'pathway_analysis_legends',
      indexes: [
        {
          unique: true,
          fields: [],
          where: {
            default: true,
            deleted_at: null,
          },
          name: 'idx_one_default_legend',
        },
      ],
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedBy'],
          },
        },
      },
      hooks: {
        beforeCreate: async (instance, options) => {
          // If setting to true, unset all others
          if (instance.default === true) {
            await sequelize.models.legend.update(
              {default: false},
              {
                where: {id: {[sequelize.Sequelize.Op.ne]: instance.id}},
                transaction: options.transaction,
              },
            );
          }
        },
        beforeUpdate: async (instance, options) => {
          // If setting to true, unset all others
          if (instance.changed('default') && instance.default === true) {
            await sequelize.models.legend.update(
              {default: false},
              {
                where: {id: {[sequelize.Sequelize.Op.ne]: instance.id}},
                transaction: options.transaction,
              },
            );
          }
        },
      },
    },
  );

  // set instance methods
  legend.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  // Ensure at least one default exists
  legend.prototype.ensureDefaultExists = async function () {
    const hasDefault = await sequelize.models.legend.findOne({
      where: {default: true},
    });

    if (!hasDefault) {
      const mostRecent = await sequelize.models.legend.findOne({
        order: [['createdAt', 'DESC']],
      });

      if (mostRecent) {
        await mostRecent.update({default: true});
      }
    }
  };

  return legend;
};
