const HTTP_STATUS = require('http-status-codes');

const db = require('../models');
const logger = require('../log');

const therapeuticTargetsMiddleware = async (req, res, next) => {
  const {report: {id: reportId}} = req;

  // Get all rows for this report
  try {
    const results = await db.models.therapeuticTarget.scope('public').findAll({
      where: {reportId},
      attributes: {include: ['id']},
      order: [['rank', 'ASC']],
    });
    req.targets = results;
    return next();
  } catch (error) {
    logger.error(`Unable to retrieve therapeutic targets ${error}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to retrieve therapeutic targets', code: 'failedTherapeuticTargetlookup'}});
  }
};

module.exports = therapeuticTargetsMiddleware;
