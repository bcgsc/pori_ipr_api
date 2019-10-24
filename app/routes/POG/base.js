const express = require('express');

const router = express.Router({mergeParams: true});

router.use('/genomic', require('./genomic'));
router.use('/probe', require('./probe'));
router.use('/image', require('./image'));
router.use('/export', require('./export'));

module.exports = router;
