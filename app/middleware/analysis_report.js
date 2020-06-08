const HTTP_STATUS = require('http-status-codes');
const db = require('../models');

// Lookup report middleware
module.exports = async (req, res, next, ident) => {
  const result = await db.models.analysis_report.findOne({
    where: {ident},
    attributes: {exclude: ['config', 'deletedAt']},
    include: [
      {model: db.models.patientInformation.scope('public'), as: 'patientInformation'},
      {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
      {model: db.models.user.scope('public'), as: 'createdBy'},
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

  // Nothing found?
  if (!result) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the requested report'}});
  }

  // report found, next()
  req.report = result;
  return next();
};
