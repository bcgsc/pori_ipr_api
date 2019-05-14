const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../../swagger.json');

const router = express.Router({mergeParams: true});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument));

module.exports = router;
