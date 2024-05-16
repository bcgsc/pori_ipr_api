const express = require('express');

const appendix = require('./appendix');

const router = express.Router({mergeParams: true});

router.use('/', appendix);

module.exports = router;
