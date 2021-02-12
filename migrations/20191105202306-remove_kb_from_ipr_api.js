module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('kb_events');
    console.log('kb_events table dropped');

    await queryInterface.dropTable('kb_histories');
    console.log('kb_histories table dropped');

    await queryInterface.dropTable('kb_references');
    console.log('kb_references table dropped');

    return true;
  },

  down: () => {
  },
};
