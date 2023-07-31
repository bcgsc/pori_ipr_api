const express = require('express');

const projectUserNotifications = require('./projectUserNotifications');
const projectUserGroupNotifications = require('./projectUserGroupNotifications');

const router = express.Router({mergeParams: true});

router.use('/project-user-notifications', projectUserNotifications);
router.use('/project-user-group-notifications', projectUserGroupNotifications);

module.exports = router;
