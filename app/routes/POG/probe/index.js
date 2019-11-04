const express = require('express');

const alterations = require('./alterations');
const genomicEventsTherapeutic = require('./genomicEventsTherapeutic');
const signature = require('./signature');
const testInformation = require('./testInformation');

const router = express.Router({mergeParams: true});

router.use('/alterations', alterations);
router.use('/genomicEventsTherapeutic', genomicEventsTherapeutic);
router.use('/signature', signature);
router.use('/testInformation', testInformation);

module.exports = router;
