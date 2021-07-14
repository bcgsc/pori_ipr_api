const express = require('express');

const projectMiddleware = require('../../middleware/project');

const project = require('./project');
const projectUsers = require('./projectUsers');
const projectReports = require('./projectReports');
const search = require('./search');

const router = express.Router({mergeParams: true});

router.param('project', projectMiddleware);

router.use('/', project);
router.use('/:project/user', projectUsers);
router.use('/:project/reports', projectReports);
router.use('/search', search);

module.exports = router;
