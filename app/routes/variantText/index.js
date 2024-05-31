const express = require('express');

const variantTexts = require('./variantTexts');

const router = express.Router({mergeParams: true});

router.use('/', variantTexts);

module.exports = router;
