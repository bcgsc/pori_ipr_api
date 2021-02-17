module.exports = (sequelize) => {
  const review = sequelize.import('./reviews');
  const variant = sequelize.import('./variants');

  const report = sequelize.import('./reports'); // Order is important
  const germlineReportsToProjects = sequelize.import('./germlineReportsToProjects');
  const {models: {project}} = sequelize;

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
