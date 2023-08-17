const express = require('express');

const notifications = require('./notification');

const router = express.Router({mergeParams: true});

router.use('/notifications', notifications);

module.exports = router;
