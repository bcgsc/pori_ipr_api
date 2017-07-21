"use strict";

module.exports = (sequelize) => {

  let notifications = {};
  notifications = sequelize.import(__dirname + '/notification'); // Order is important
  notifications.belongsTo(sequelize.models.user, {as: 'user', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true});

};
