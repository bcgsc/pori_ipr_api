module.exports = (sequelize) => {
  const review = sequelize.import('./germline_small_mutations_review.model');
  const variant = sequelize.import('./germline_small_mutations_variant.model');

  const report = sequelize.import('./germline_small_mutations.model'); // Order is important

  report.belongsTo(sequelize.models.pog_analysis, {
    as: 'analysis', foreignKey: 'pog_analysis_id', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });
  report.belongsTo(sequelize.models.user, {
    as: 'biofx_assigned', foreignKey: 'biofx_assigned_id', onDelete: 'SET NULL', constraints: true,
  });

  report.hasMany(variant, {
    as: 'variants', foreignKey: 'germline_report_id', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });
  report.hasMany(review, {
    as: 'reviews', foreignKey: 'germline_report_id', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });

  variant.belongsTo(report, {
    as: 'germline_report', foreignKey: 'germline_report_id', onDelete: 'CASCADE', constraints: true,
  });

  review.belongsTo(report, {
    as: 'germline_report', foreignKey: 'germline_report_id', onDelete: 'CASCADE', constraints: true,
  });
  review.belongsTo(sequelize.models.user, {
    as: 'reviewedBy', foreignKey: 'reviewedBy_id', onDelete: 'SET NULL', constraints: true,
  });
};
