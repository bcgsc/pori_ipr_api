const HTTP_STATUS = require('http-status-codes');
const db = require('../../models');
const logger = require('../../log');

// Middleware for germline reports
module.exports = async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.germline_small_mutation.findOne({
      where: {ident},
      order: [['createdAt', 'desc']],
      include: [
        {as: 'biofx_assigned', model: db.models.user.scope('public')},
        {as: 'projects', model: db.models.project},
        {
          as: 'variants', model: db.models.germline_small_mutation_variant, separate: true, order: [['gene', 'asc']],
        },
        {
          as: 'reviews', model: db.models.germline_small_mutation_review, separate: true, include: [{model: db.models.user.scope('public'), as: 'reviewedBy'}],
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to get germline report ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to get germline report'}});
  }

  if (!result) {
    logger.error('Unable to find germline report');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find germline report'}});
  }
  req.report = result;
  return next();
};
