const express = require('express');

const variant = require('./variants');
const reviews = require('./reviews');
const users = require('./users');

const router = express.Router({mergeParams: true});

router.use('/variants', variant);
router.use('/reviews', reviews);
router.use('/users', users);

module.exports = router;
