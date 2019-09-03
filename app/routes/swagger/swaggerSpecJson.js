const express = require('express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load('./swagger.yaml');
// Add API version info to swagger doc
swaggerDocument.info.version = process.env.npm_package_version;

const router = express.Router({mergeParams: true});

router.route('/')
  .get((req, res) => {
    return res.json(swaggerDocument);
  });

module.exports = router;
