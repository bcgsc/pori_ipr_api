const HTTP_STATUS = require('http-status-codes');
const db = require('../../models');
const logger = require('../../log');

// Middleware for germline variants
module.exports = async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.germline_small_mutation_variant.findOne({
      where: {ident, germline_report_id: req.report.id},
    });
  } catch (error) {
    logger.error(`Error while trying to get germline report variant ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to get germline report variant'}});
  }

  if (!result) {
    logger.error('Unable to find germline report variant');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find germline report variant'}});
  }

  req.variant = result;
  return next();
};
