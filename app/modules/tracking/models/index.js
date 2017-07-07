"use strict";

module.exports = (sequelize) => {

  let tracking = {};
  tracking.checkins = sequelize.import(__dirname + '/state_task_checkins'); // Order is important
  tracking.task = sequelize.import(__dirname + '/state_task');
  tracking.state = sequelize.import(__dirname + '/states');
  tracking.definition = sequelize.import(__dirname + '/state_definitions');

  tracking.state.belongsTo(sequelize.models.pog_analysis, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE', constraints: true});
  tracking.state.belongsTo(sequelize.models.user, {as: 'createdBy', foreignKey: 'createdBy_id', onDelete: 'SET NULL', constraints: true});

  tracking.state.hasMany(tracking.task, {as: 'tasks', foreignKey: 'state_id', sourceKey: 'id', constraints: true});
  tracking.state.belongsTo(sequelize.models.userGroup, {as: 'group', foreignKey: 'group_id', onDelete: 'SET NULL', constraints: true});

  tracking.task.belongsTo(tracking.state, {as: 'state', foreignKey: 'state_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
  tracking.task.belongsTo(sequelize.models.user, {as: 'assignedTo', foreignKey: 'assignedTo_id', onDelete: 'SET NULL', constraints: true});

  tracking.task.hasMany(tracking.checkins, {as: 'checkins', foreignKey: 'task_id', onDelete: 'CASCADE', constraints: true});

  tracking.definition.belongsTo(sequelize.models.userGroup, {as: 'group', foreignKey: 'group_id', onDelete: 'SET NULL', constraints: true});

  tracking.checkins.belongsTo(tracking.task, {as: 'task', foreignKey: 'task_id', onDelete: 'CASCADE', constraints: true});
  tracking.checkins.belongsTo(sequelize.models.user, {as: 'user', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true,});

};
