const express = require('express');

const reports = require('./index');
const image = require('./image');
const signature = require('./probe/signature');

const router = express.Router({mergeParams: true});

router.use('/', reports);
router.use('/probe/signature', signature);
router.use('/image', image);

module.exports = router;
