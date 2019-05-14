const express = require('express');
const swaggerDocument = require('../../../swagger.json');

const router = express.Router({mergeParams: true});

router.route('/')
  .get((req, res) => {
    return res.json(swaggerDocument);
  });

module.exports = router;
