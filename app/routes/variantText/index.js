const express = require('express');

const variantText = require('./variantText');

const router = express.Router({mergeParams: true});

router.use('/', variantText);

module.exports = router;
