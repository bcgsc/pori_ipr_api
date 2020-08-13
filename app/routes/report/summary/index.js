const express = require('express');
const analystComments = require('./analystComments');
const genomicAlterationsIdentified = require('./genomicAlterationsIdentified');
const microbial = require('./microbial');
const pathwayAnalysis = require('./pathwayAnalysis');
const variantCounts = require('./variantCounts');

const router = express.Router({mergeParams: true});

router.use('/analyst-comments', analystComments);
router.use('/genomic-alterations-identified', genomicAlterationsIdentified);
router.use('/microbial', microbial);
router.use('/pathway-analysis', pathwayAnalysis);
router.use('/variant-counts', variantCounts);

module.exports = router;
