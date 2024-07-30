const express = require('express');

const groupMiddleware = require('../../middleware/group');

const user = require('./user');
const group = require('./group');
const member = require('./member');
const settings = require('./settings');

const router = express.Router({mergeParams: true});

router.param('group', groupMiddleware);

router.use('/', user);
router.use('/group', group);
router.use('/group/:group/member', member);
router.use('/settings', settings);

module.exports = router;

// TODO: add manager/admin restrictions
