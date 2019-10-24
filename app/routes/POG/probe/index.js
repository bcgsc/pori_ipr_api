const express = require('express');

const router = express.Router({mergeParams: true});

router.use('/alterations', require('./alterations'));
router.use('/genomicEventsTherapeutic', require('./genomicEventsTherapeutic'));
router.use('/signature', require('./signature'));
router.use('/testInformation', require('./testInformation'));

module.exports = router;
