const HTTP_STATUS = require('http-status-codes');
const db = require('../../models');
const logger = require('../../log');

// Middleware for germline reviews
module.exports = async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.germline_small_mutation_review.findOne({
      where: {ident},
      include: [
        {model: db.models.user.scope('public'), as: 'reviewedBy'},
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to get germline report reviews ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to get germline report reviews'}});
  }

  if (!result) {
    logger.error('Unable to find germline report reviews');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find germline report reviews'}});
  }

  req.review = result;
  return next();
};
