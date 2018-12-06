module.exports = (sequelize) => {
  const analysis = sequelize.import('./analysis.model');
  analysis.belongsTo(sequelize.models.POG, {as: 'pog', foreignKey: 'pog_id', onDelete: 'CASCADE'});
};
