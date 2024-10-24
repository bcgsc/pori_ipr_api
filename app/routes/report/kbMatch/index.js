const express = require('express');

const kbMatchMiddleware = require('../../../middleware/kbMatch');

const kbMatches = require('./kbMatches');
const kbMatchedStatements = require('./kbMatchedStatements');

const router = express.Router({mergeParams: true});

router.param('kbMatch', kbMatchMiddleware);

router.use('/', kbMatches);
router.use('/kb-matched-statements', kbMatchedStatements);

module.exports = router;
