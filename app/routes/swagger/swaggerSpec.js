const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const schemas = require('./schemas');
const server = require('./swaggerUrl');

// Add API version info to swagger doc
swaggerDocument.info.version = process.env.npm_package_version;

const router = express.Router({mergeParams: true});

swaggerDocument.components.schemas = {
  ...swaggerDocument.components.schemas,
  ...schemas,
};
swaggerDocument.servers = server;

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument));

module.exports = router;
