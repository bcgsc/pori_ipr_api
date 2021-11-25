const express = require('express');

const templateMiddleware = require('../../middleware/template');

const template = require('./template');
const templateAppendix = require('./templateAppendix');

const router = express.Router({mergeParams: true});

router.param('template', templateMiddleware);

router.use('/', template);
router.use('/:template/appendix', templateAppendix);

module.exports = router;
