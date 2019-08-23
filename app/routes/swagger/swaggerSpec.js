const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load('./swagger.yaml');
// Add API version info to swagger doc
swaggerDocument.info.version = process.env.npm_package_version;

const router = express.Router({mergeParams: true});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument));

module.exports = router;
