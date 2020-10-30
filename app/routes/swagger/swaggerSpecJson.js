const express = require('express');
const swaggerDocument = require('./swagger.json');
const schemas = require('./schemas');
const server = require('./swaggerUrl');

// Add API version info to swagger doc
swaggerDocument.info.version = process.env.npm_package_version;
swaggerDocument.components.schemas = {
  ...swaggerDocument.components.schemas,
  ...schemas,
};
swaggerDocument.servers = server;

const router = express.Router({mergeParams: true});

router.route('/')
  .get((req, res) => {
    return res.json(swaggerDocument);
  });

module.exports = router;
