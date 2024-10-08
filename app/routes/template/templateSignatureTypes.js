const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const createSchema = schemaGenerator(db.models.templateSignatureTypes, {
  baseUri: '/create', exclude: [...BASE_EXCLUDE, 'templateId'],
});

// Add middleware to get template signature type
router.use('/', async (req, res, next) => {
  try {
    if (req.body.signatureType) {
      req.templateSignatureTypes = await db.models.templateSignatureTypes.scope('public').findOne({
        where: {templateId: req.template.id, signatureType: req.body.signatureType},
      });
    } else {
      req.templateSignatureTypes = await db.models.templateSignatureTypes.scope('public').findAll({
        where: {templateId: req.template.id},
      });
    }
  } catch (error) {
    logger.error(`Unable to get template signature type ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get template signature type'},
    });
  }

  // Throw an error for a POST when a template signature already exists
  if (req.templateSignatureTypes && req.method === 'POST') {
    logger.warn(`Template signature type ${req.body.signatureType} already exists for ${req.template.name}`);
    return res.status(HTTP_STATUS.CREATED).json(req.templateSignatureTypes.view('public'));
  }

  // Throw an error for everything but a POST if the signature doesn't exist
  if ((!req.templateSignatureTypes || req.templateSignatureTypes.length === 0) && req.method !== 'POST') {
    logger.error(`Template signature type does not exist for ${req.template.name}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Template signature type does not exist for ${req.template.name}`},
    });
  }
  return next();
});

// Handle requests for template by ident
router.route('/')
  .get((req, res) => {
    return res.json(req.templateSignatureTypes);
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating template signature type create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Create new entry in db
    try {
      const result = await db.models.templateSignatureTypes.create({
        ...req.body,
        templateId: req.template.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create template signature type ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create template signature type'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete template signature type
    try {
      await db.models.templateSignatureTypes.destroy({where: {templateId: req.template.id}});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing template signature type ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while removing template signature type'},
      });
    }
  });

module.exports = router;
