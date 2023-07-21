const express = require('express');

const projectMiddleware = require('../../middleware/project');

const project = require('./project');
const projectUsers = require('./projectUsers');
const projectReports = require('./projectReports');
const projectUserNotifications = require('./projectUserNotifications')
const search = require('./search');
const targets = require('./therapeuticTargets');

const router = express.Router({mergeParams: true});

router.param('project', projectMiddleware);

router.use('/', project);
router.use('/:project/user', projectUsers);
router.use('/:project/reports', projectReports);
router.use('/:project/usernotifications', projectUserNotifications);
router.use('/:project/therapeutic-targets', targets);
router.use('/search', search);

module.exports = router;
