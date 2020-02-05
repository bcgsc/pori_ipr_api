const express = require('express');

const genomic = require('./genomic');
const image = require('./image');
const _export = require('./export');
const signature = require('./probe/signature');

const router = express.Router({mergeParams: true});

router.use('/:reportType(genomic|probe)', genomic);
router.use('/probe/signature', signature);
router.use('/image', image);
router.use('/export', _export);

module.exports = router;
