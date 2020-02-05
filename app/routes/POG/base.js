const express = require('express');

const genomic = require('./genomic');
const probe = require('./probe');
const image = require('./image');
const _export = require('./export');

const router = express.Router({mergeParams: true});

router.use('/probe', probe);
router.use('/:reportType(genomic|probe)', genomic);
router.use('/image', image);
router.use('/export', _export);

module.exports = router;
