const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

// Lookup report middleware
module.exports = async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.analysis_report.findOne({
      where: {ident},
      attributes: {exclude: ['config']},
      include: [
        {model: db.models.patientInformation.scope('public'), as: 'patientInformation'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {model: db.models.template.scope('public'), as: 'template'},
        {
          model: db.models.analysis_reports_user,
          as: 'users',
          separate: true,
          attributes: {exclude: ['id', 'reportId', 'user_id', 'addedBy_id', 'deletedAt']},
          include: [
            {model: db.models.user.scope('public'), as: 'user'},
          ],
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to get report: ${ident} ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get report'}});
  }

  // Nothing found?
  if (!result) {
    logger.error(`Unable to find the requested report ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the requested report'}});
  }

  // Add report to request
  req.report = result;
  return next();
};
