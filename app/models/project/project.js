const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

const logger = require('../../log');

module.exports = sequelize => sequelize.define('project', {
  ...DEFAULT_COLUMNS,
  name: {
    type: Sq.STRING,
    allowNull: false,
  },
},
{
  ...DEFAULT_OPTIONS,
  indexes: [
    ...DEFAULT_OPTIONS.indexes || [],
    {
      unique: true,
      fields: ['name'],
      where: {
        deleted_at: {
          [Sq.Op.eq]: null,
        },
      },
    },
  ],
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'deletedAt'],
      },
    },
  },
  hooks: {
    afterCreate(project) {
      // every new project should be associated with control sample COLO829
      sequelize.models.POG.findOne({where: {POGID: 'COLO829'}})
        .then(pog => sequelize.models.pog_project.create({project_id: project.id, pog_id: pog.id}))
        .catch((err) => {
          logger.error(`Unable to bind COLO829 to project: ${err}`);
        });
    },
  },
});
