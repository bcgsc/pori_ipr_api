const user = require('./user');
const project = require('./project');
const pog = require('./pog');
const report = require('./report/entireReport');
const germlineSmallMutationIndex = require('./germlineSmallMutation/index');
const germlineSmallMutationVariants = require('./germlineSmallMutation/variants');
const germlineSmallMutationUpload = require('./germlineSmallMutation/upload');

module.exports = {
  user,
  project,
  pog,
  report,
  germlineSmallMutationIndex,
  germlineSmallMutationUpload,
  germlineSmallMutationVariants,
};
