const express = require('express');

const templateMiddleware = require('../../middleware/template');

const template = require('./template');
const templateAppendix = require('./templateAppendix');
const templateSignatureTypes = require('./templateSignatureTypes');

const router = express.Router({mergeParams: true});

router.param('template', templateMiddleware);

router.use('/', template);
router.use('/:template/appendix', templateAppendix);
router.use('/:template/signature-types', templateSignatureTypes);

module.exports = router;
