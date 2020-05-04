const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const reviewMiddleware = require('../../middleware/germlineSmallMutation/germline_small_mutation_review.middleware');
const db = require('../../models');

const Review = require('./util/germline_small_mutation_review');

const router = express.Router({mergeParams: true});

router.param('review', reviewMiddleware);

/**
 * Add review event for germline report
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {number} req.user.id - Current users id
 * @property {string} req.body.type - Type of request
 * @property {number} req.report.id - Germline report id
 *
 * @returns {Promise.<object>} - Returns new review for germline report
 */
router.put('/', async (req, res) => {
  if (!req.body.type) {
    logger.error('A review type is required in the body');
    return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'A review type is required in the body'});
  }

  const opts = {
    where: {
      reviewedBy_id: req.user.id,
      type: req.body.type,
      germline_report_id: req.report.id,
    },
  };

  let review;
  try {
    // Make sure not already signed
    review = await db.models.germline_small_mutation_review.scope('public').findOne(opts);
  } catch (error) {
    logger.error(`There was an error while trying to find germline review ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while trying to find germline review'});
  }

  if (review) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({message: `Report has already been reviewed by ${review.reviewedBy.firstName} ${review.reviewedBy.lastName} for ${req.body.type}`});
  }

  // Create new review
  const data = {
    germline_report_id: req.report.id,
    reviewedBy_id: req.user.id,
    type: req.body.type,
    comment: req.body.comment,
  };

  let createdReview;
  try {
    createdReview = await db.models.germline_small_mutation_review.create(data);
  } catch (error) {
    logger.error(`There was an error while creating germline review ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while creating germline review'});
  }

  if (res.finished) {
    logger.error('Response finished can\'t review report');
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Reponse finished can\'t review report'});
  }

  try {
    const newReview = await Review.public(createdReview.ident);
    return res.json(newReview);
  } catch (error) {
    logger.error(`There was an error while creating a review for this report ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while creating a review for this report'});
  }
});

/**
 * Remove a review from a report
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {object} req.review - Report review
 *
 * @returns {Promise.<object>} - Returns 204 status
 */
router.delete('/:review', async (req, res) => {
  try {
    await db.models.germline_small_mutation_review.destroy({where: {ident: req.review.ident}});
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    logger.error(`There was an error while trying to remove the requested germline report ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while trying to remove the requested germline report'});
  }
});


module.exports = router;
