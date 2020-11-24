const express = require('express');

const variant = require('./variants');
const reviews = require('./reviews');

const router = express.Router({mergeParams: true});

router.use('/variants', variant);
router.use('/reviews', reviews);

module.exports = router;
