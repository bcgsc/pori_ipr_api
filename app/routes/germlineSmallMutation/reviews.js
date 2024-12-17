const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const logger = require('../../log');
const db = require('../../models');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {GERMLINE_CREATE_BASE_URI, GERMLINE_UPDATE_BASE_URI} = require('../../constants');
const {GERMLINE_EXCLUDE} = require('../../schemas/exclude');

// Set additional update properties
const reviewerProperties = {
  makeMeReviewer: {
    type: 'boolean',
  },
};

// Generate schema's
const createSchema = schemaGenerator(db.models.germlineSmallMutationReview, {
  baseUri: GERMLINE_CREATE_BASE_URI, exclude: [...GERMLINE_EXCLUDE, 'reviewerId'],
});
const updateSchema = schemaGenerator(db.models.germlineSmallMutationReview, {
  baseUri: GERMLINE_UPDATE_BASE_URI,
  exclude: [...GERMLINE_EXCLUDE, 'reviewerId'],
  properties: reviewerProperties,
  nothingRequired: true,
});

// Middleware for germline reviews
router.param('review', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.germlineSmallMutationReview.findOne({
      where: {ident, germlineReportId: req.report.id},
      include: [
        {model: db.models.user.scope('public'), as: 'reviewer'},
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to get germline report reviews ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {message: 'Error while trying to get germline report reviews'},
    });
  }

  if (!result) {
    logger.error('Unable to find germline report reviews');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find germline report reviews'},
    });
  }

  req.review = result;
  return next();
});

// Handles requests for a single germline review
router.route('/:review')
  .get((req, res) => {
    return res.json(req.review.view('public'));
  })
  .put(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the germline review update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // check if the reviewer is being updated
    if (req.body.makeMeReviewer) {
      req.body.reviewerId = req.user.id;
    }

    // Update db entry
    try {
      await req.review.update(req.body, {userId: req.user.id});
      await req.review.reload();
      return res.json(req.review.view('public'));
    } catch (error) {
      logger.error(`Unable to update germline review ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update germline review'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete germline review
    try {
      await req.review.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`There was an error while trying to remove the requested germline review ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to remove the requested germline review'},
      });
    }
  });

// Handles requests for all germline reviews for a report
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.germlineSmallMutationReview.scope('public').findAll({
        where: {germlineReportId: req.report.id},
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve germline reviews ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve germline reviews'},
      });
    }
  })
  .post(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the germline review create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    let review;
    try {
      // Make sure review doesn't already exist
      review = await db.models.germlineSmallMutationReview.scope('public').findOne({
        where: {germlineReportId: req.report.id, type: req.body.type},
      });
    } catch (error) {
      logger.error(`There was an error while trying to find germline review ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'There was an error while trying to find germline review'},
      });
    }

    if (review) {
      const message = `Report has already been reviewed by ${review.reviewer.firstName} ${review.reviewer.lastName} for ${req.body.type}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Add new review to germline report
      const newReview = await db.models.germlineSmallMutationReview.create({
        ...req.body,
        reviewerId: req.user.id,
        germlineReportId: req.report.id,
      });

      // Load new review with associations
      const result = await db.models.germlineSmallMutationReview.scope('public').findOne({
        where: {id: newReview.id},
      });

      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Unable to create new germline review ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create new germline review'},
      });
    }
  });

module.exports = router;
