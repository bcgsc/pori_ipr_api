const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('analysis_reports_user', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ident: {
    type: Sq.UUID,
    unique: true,
    defaultValue: Sq.UUIDV4,
  },
  role: {
    type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'reviewer', 'admin'),
    allowNull: false,
  },
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  pog_report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  user_id: {
    type: Sq.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  addedBy_id: {
    type: Sq.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },

},
{
  tableName: 'pog_analysis_reports_users',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes
  paranoid: true,
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_report_id', 'user_id'],
      },
      include: [
        {model: sequelize.models.user.scope('public'), as: 'user'},
      ],
    },
  },
});
