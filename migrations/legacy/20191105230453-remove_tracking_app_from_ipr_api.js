module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('pog_tracking_hook_events', {cascade: true});
    console.log('pog_tracking_hook_events table dropped');

    await queryInterface.dropTable('pog_tracking_hooks', {cascade: true});
    console.log('pog_tracking_hooks table dropped');

    await queryInterface.dropTable('pog_tracking_state_definitions', {cascade: true});
    console.log('pog_tracking_state_definitions table dropped');

    await queryInterface.dropTable('pog_tracking_state_task_checkins', {cascade: true});
    console.log('pog_tracking_state_task_checkins table dropped');

    await queryInterface.dropTable('pog_tracking_state_tasks', {cascade: true});
    console.log('pog_tracking_state_tasks table dropped');

    await queryInterface.dropTable('pog_tracking_states', {cascade: true});
    console.log('pog_tracking_states table dropped');

    await queryInterface.dropTable('pog_tracking_ticket_template', {cascade: true});
    console.log('pog_tracking_ticket_template table dropped');

    return true;
  },

  down: () => {
  },
};
