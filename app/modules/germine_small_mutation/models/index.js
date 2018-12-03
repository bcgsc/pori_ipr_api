module.exports = (sequelize) => {
  const gsm = {};

  gsm.review = sequelize.import(`${__dirname}/germline_small_mutations_review.model`);
  gsm.variant = sequelize.import(`${__dirname}/germline_small_mutations_variant.model`);

  gsm.report = sequelize.import(`${__dirname}/germline_small_mutations.model`); // Order is important

  gsm.report.belongsTo(sequelize.models.pog_analysis, {
    as: 'analysis', foreignKey: 'pog_analysis_id', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });
  gsm.report.belongsTo(sequelize.models.user, {
    as: 'biofx_assigned', foreignKey: 'biofx_assigned_id', onDelete: 'SET NULL', constraints: true,
  });

  gsm.report.hasMany(gsm.variant, {
    as: 'variants', foreignKey: 'germline_report_id', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });
  gsm.report.hasMany(gsm.review, {
    as: 'reviews', foreignKey: 'germline_report_id', sourceKey: 'id', onDelete: 'CASCADE', constraints: true,
  });

  gsm.variant.belongsTo(gsm.report, {
    as: 'germline_report', foreignKey: 'germline_report_id', onDelete: 'CASCADE', constraints: true,
  });

  gsm.review.belongsTo(gsm.report, {
    as: 'germline_report', foreignKey: 'germline_report_id', onDelete: 'CASCADE', constraints: true,
  });
  gsm.review.belongsTo(sequelize.models.user, {
    as: 'reviewedBy', foreignKey: 'reviewedBy_id', onDelete: 'SET NULL', constraints: true,
  });
};
