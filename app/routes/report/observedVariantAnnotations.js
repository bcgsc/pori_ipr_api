const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

const {KB_PIVOT_MAPPING} = require('../../constants');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schemas
const createSchema = schemaGenerator(db.models.observedVariantAnnotations, {
  baseUri: REPORT_CREATE_BASE_URI,
});

// we only want to allow updates to annotations
const updateSchema = schemaGenerator(db.models.observedVariantAnnotations, {
  baseUri: REPORT_UPDATE_BASE_URI,
  exclude: ['variantType'],
});

// Middleware for observed variant annotation
router.param('observedVariantAnnotation', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.observedVariantAnnotations.findOne({
      where: {ident, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Error while getting observed variant annotation ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while getting observed variant annotation'}});
  }

  if (!result) {
    logger.error(`Unable to find observed variant annotation, ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find observed variant annotation, ident: ${ident}`}});
  }

  // Add observed variant annotation to request
  req.observedVariantAnnotation = result;
  return next();
});

// Routing for Alteration
router.route('/')
  .post(async (req, res) => {
    // Check that the variant type is real
    let variantType;
    try {
      variantType = KB_PIVOT_MAPPING[req.body.variantType];
    } catch (error) {
      const message = `Error checking variant type ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Check that the variant is in the db
    let variant;
    try {
      variant = await db.models[variantType].findOne({
        where: {ident: req.body.variantIdent, reportId: req.report.id},
      });
    } catch (error) {
      const message = `Error while checking that linked variant exists ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (!(variant)) {
      const message = 'Variant not found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // add the variant id and remove the ident
    req.body.variantId = variant.id;
    delete req.body.variantIdent;

    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating observed variant annotation create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // check whether there is already a record for this variant id; don't make another one
    let annotation;
    try {
      annotation = await db.models.observedVariantAnnotations.findOne({
        where: {
          variantId: req.body.variantId,
          variantType: req.body.variantType,
          reportId: req.report.id,
        },
      });
    } catch (error) {
      const message = `Error while checking for preexisting annotation record ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    if (annotation) {
      const message = 'Annotation record already exists for this variant';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Create new entry in db
    try {
      const result = await db.models.observedVariantAnnotations.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create mutation burden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create mutation burden'},
      });
    }
  });

router.route('/:observedVariantAnnotation([A-z0-9-]{36})')
  .put(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(updateSchema, req.body);
    } catch (error) {
      const message = `Error while validating observed variant annotation update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.observedVariantAnnotation.update(req.body, {userId: req.user.id});
      return res.json(req.observedVariantAnnotation.view('public'));
    } catch (error) {
      logger.error(`Unable to create update observed variant annotation ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create observed variant annotation'},
      });
    }
  });

module.exports = router;
