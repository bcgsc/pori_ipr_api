const reviewModel = require('./reviews');
const variantModel = require('./variants');
const reportModel = require('./reports');
const reportProjectModel = require('./germlineReportsToProjects');
const reportUserModel = require('./users');

module.exports = (sequelize, Sq) => {
  const review = reviewModel(sequelize, Sq);
  const variant = variantModel(sequelize, Sq);
  const germlineReportsToProjects = reportProjectModel(sequelize, Sq);
  const germlineReportUsers = reportUserModel(sequelize, Sq);

  const report = reportModel(sequelize, Sq); // Order is important
  const {models: {project, user}} = sequelize;

  report.hasMany(germlineReportUsers, {
    as: 'users', foreignKey: 'germlineReportId', onDelete: 'CASCADE', constraints: true,
  });

  germlineReportUsers.belongsTo(report, {
    as: 'report', foreignKey: 'germlineReportId', onDelete: 'CASCADE', constraints: true,
  });
  germlineReportUsers.belongsTo(user, {
    as: 'addedBy', foreignKey: 'addedById', onDelete: 'SET NULL', constraints: true,
  });
  germlineReportUsers.belongsTo(user, {
    as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
  });

  // M2M relationship between reports and projects
  report.belongsToMany(project, {
    as: 'projects',
    through: {model: germlineReportsToProjects, unique: false},
    foreignKey: 'germlineReportId',
    otherKey: 'project_id',
    onDelete: 'CASCADE',
  });

  report.belongsTo(sequelize.models.user, {
    as: 'biofxAssigned', foreignKey: 'biofxAssignedId', onDelete: 'SET NULL', constraints: true,
  });

  report.hasMany(variant, {
    as: 'variants', foreignKey: 'germlineReportId', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });
  report.hasMany(review, {
    as: 'reviews', foreignKey: 'germlineReportId', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });

  variant.belongsTo(report, {
    as: 'germlineReport', foreignKey: 'germlineReportId', onDelete: 'CASCADE', constraints: true,
  });

  review.belongsTo(report, {
    as: 'germlineReport', foreignKey: 'germlineReportId', onDelete: 'CASCADE', constraints: true,
  });
  review.belongsTo(sequelize.models.user, {
    as: 'reviewer', foreignKey: 'reviewerId', onDelete: 'SET NULL', constraints: true,
  });
};
