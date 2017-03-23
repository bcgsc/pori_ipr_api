let changeCase = require('change-case'),
  recursive = require('recursive-readdir'),
  _ = require('lodash'),
  router = require('express').Router({mergeParams: true});

router.use('/validate', require('./validate'));

module.exports = router;