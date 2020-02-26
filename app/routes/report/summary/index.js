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

router.use('/analyst-comments', analystComments);
router.use('/genomicAlterationsIdentified', genomicAlterationsIdentified);
router.use('/genomic-events-therapeutic', genomicEventsTherapeutic);
router.use('/microbial', microbial);
router.use('/mutationSummary', mutationSummary);
router.use('/pathway-analysis', pathwayAnalysis);
router.use('/probe-results', probeResults);
router.use('/tumour-analysis', tumourAnalysis);
router.use('/variant-counts', variantCounts);

module.exports = router;
