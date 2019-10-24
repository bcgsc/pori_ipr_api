const express = require('express');

const router = express.Router({mergeParams: true});

router.use('/analystComments', require('./analystComments'));
router.use('/genomicAlterationsIdentified', require('./genomicAlterationsIdentified'));
router.use('/genomicEventsTherapeutic', require('./genomicEventsTherapeutic'));
router.use('/microbial', require('./microbial'));
router.use('/mutationSummary', require('./mutationSummary'));
router.use('/pathwayAnalysis', require('./pathwayAnalysis'));
router.use('/probeTarget', require('./probeTarget'));
router.use('/tumourAnalysis', require('./tumourAnalysis'));
router.use('/variantCounts', require('./variantCounts'));

module.exports = router;
