const express = require('express');

const reports = require('./reports');
const image = require('./image');
const _export = require('./export');
const signature = require('./probe/signature');

const router = express.Router({mergeParams: true});

router.use('/:reportType(genomic|probe)', reports);
router.use('/probe/signature', signature);
router.use('/image', image);
router.use('/export', _export);

module.exports = router;
