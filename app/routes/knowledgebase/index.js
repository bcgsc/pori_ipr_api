let changeCase = require('change-case'),
  recursive = require('recursive-readdir'),
  _ = require('lodash'),
  router = require('express').Router({mergeParams: true});

router.use('/validate', require('./validate'));

router.use('/genevar', require('./genevar'));

module.exports = router;