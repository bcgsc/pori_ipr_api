const express = require('express');
const analystComments = require('./analystComments');
const genomicAlterationsIdentified = require('./genomicAlterationsIdentified');
const genomicEventsTherapeutic = require('./genomicEventsTherapeutic');
const microbial = require('./microbial');
const mutationSummary = require('./mutationSummary');
const pathwayAnalysis = require('./pathwayAnalysis');
const probeResults = require('./probeResults');
const tumourAnalysis = require('./tumourAnalysis');
const variantCounts = require('./variantCounts');

const router = express.Router({mergeParams: true});

router.use('/analystComments', analystComments);
router.use('/genomicAlterationsIdentified', genomicAlterationsIdentified);
router.use('/genomicEventsTherapeutic', genomicEventsTherapeutic);
router.use('/microbial', microbial);
router.use('/mutationSummary', mutationSummary);
router.use('/pathwayAnalysis', pathwayAnalysis);
router.use('/probe-results', probeResults);
router.use('/tumourAnalysis', tumourAnalysis);
router.use('/variantCounts', variantCounts);

module.exports = router;
