const express = require('express');

const reports = require('./index');
const image = require('./image');

const router = express.Router({mergeParams: true});

router.use('/', reports);
router.use('/image', image);

module.exports = router;
