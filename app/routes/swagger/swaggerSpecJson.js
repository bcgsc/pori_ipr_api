const express = require('express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load('./swagger.yaml');

const router = express.Router({mergeParams: true});

router.route('/')
  .get((req, res) => {
    return res.json(swaggerDocument);
  });

module.exports = router;
