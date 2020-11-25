const express = require('express');

const variant = require('./variants');
const reviews = require('./reviews');

const router = express.Router({mergeParams: true});

router.use('/variant', variant);
router.use('/review', reviews);

module.exports = router;
